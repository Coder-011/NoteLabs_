import Dexie, { type Table } from 'dexie';

export interface FluteProfile {
  id?: number;
  name: string;
  createdAt: number;
  isActive: boolean;
}

export interface FluteSample {
  id?: number;
  profileId: number;
  noteName: string; // 'Sa', 'Re', 'Ga', 'Ma', 'Pa', 'Dha', 'Ni'
  blob: Blob;
}

export class SamplerDB extends Dexie {
  profiles!: Table<FluteProfile, number>;
  samples!: Table<FluteSample, number>;

  constructor() {
    super('SamplerDB');
    this.version(1).stores({
      profiles: '++id, name, isActive, createdAt',
      samples: '++id, profileId, [profileId+noteName], noteName'
    });
  }
}

export const samplerDB = new SamplerDB();

export const initSamplerDB = async () => {
  try {
    const activeCount = await samplerDB.profiles.count();
    if (activeCount === 0) {
      // Create a default profile
      await samplerDB.profiles.add({
        name: 'Default Flute',
        createdAt: Date.now(),
        isActive: true
      });
    }
  } catch (error) {
    console.error('Failed to initialize SamplerDB', error);
  }
};

export const getProfiles = async (): Promise<FluteProfile[]> => {
  return await samplerDB.profiles.toArray();
};

export const getActiveProfile = async (): Promise<FluteProfile | undefined> => {
  const profiles = await getProfiles();
  return profiles.find(p => p.isActive);
};

export const setActiveProfile = async (id: number): Promise<void> => {
  await samplerDB.transaction('rw', samplerDB.profiles, async () => {
    await samplerDB.profiles.toCollection().modify({ isActive: false });
    await samplerDB.profiles.update(id, { isActive: true });
  });
};

export const addProfile = async (name: string): Promise<number> => {
  const count = await samplerDB.profiles.count();
  if (count >= 4) {
    throw new Error('Maximum of 4 profiles allowed');
  }
  
  let id = 0;
  await samplerDB.transaction('rw', samplerDB.profiles, async () => {
    await samplerDB.profiles.toCollection().modify({ isActive: false });
    id = await samplerDB.profiles.add({
      name,
      createdAt: Date.now(),
      isActive: true
    });
  });
  return id;
};

export const deleteProfile = async (id: number): Promise<void> => {
  await samplerDB.transaction('rw', samplerDB.profiles, samplerDB.samples, async () => {
    await samplerDB.profiles.delete(id);
    await samplerDB.samples.where('profileId').equals(id).delete();
    
    // Ensure one profile is active if any remain
    const remaining = await samplerDB.profiles.toArray();
    if (remaining.length > 0 && !remaining.some(p => p.isActive)) {
      await samplerDB.profiles.update(remaining[0].id!, { isActive: true });
    }
  });
};

export const saveSample = async (profileId: number, noteName: string, blob: Blob): Promise<void> => {
  const existing = await samplerDB.samples.where({ profileId, noteName }).first();
  if (existing && existing.id) {
    await samplerDB.samples.update(existing.id, { blob });
  } else {
    await samplerDB.samples.add({ profileId, noteName, blob });
  }
};

export const getSample = async (profileId: number, noteName: string): Promise<FluteSample | undefined> => {
  return await samplerDB.samples.where({ profileId, noteName }).first();
};

export const getSamplesForProfile = async (profileId: number): Promise<FluteSample[]> => {
  return await samplerDB.samples.where('profileId').equals(profileId).toArray();
};

// Backup and Restore
export const exportProfileBackup = async (): Promise<string> => {
  const profiles = await getProfiles();
  const allSamples = await samplerDB.samples.toArray();
  
  const serializedSamples = await Promise.all(allSamples.map(async (sample) => {
    const arrayBuffer = await sample.blob.arrayBuffer();
    const base64 = btoa(
      new Uint8Array(arrayBuffer)
        .reduce((data, byte) => data + String.fromCharCode(byte), '')
    );
    return {
      ...sample,
      blobBase64: base64,
      mimeType: sample.blob.type
    };
  }));

  const backupData = {
    profiles,
    samples: serializedSamples,
    exportDate: new Date().toISOString()
  };

  return JSON.stringify(backupData);
};

export const importProfileBackup = async (backupJson: string): Promise<void> => {
  const data = JSON.parse(backupJson);
  if (!data.profiles || !data.samples) {
    throw new Error('Invalid backup format');
  }

  await samplerDB.transaction('rw', samplerDB.profiles, samplerDB.samples, async () => {
    await samplerDB.profiles.clear();
    await samplerDB.samples.clear();

    for (const profile of data.profiles) {
      await samplerDB.profiles.add(profile);
    }

    for (const sampleData of data.samples) {
      const binaryString = atob(sampleData.blobBase64);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }
      const blob = new Blob([bytes], { type: sampleData.mimeType });
      
      await samplerDB.samples.add({
        id: sampleData.id,
        profileId: sampleData.profileId,
        noteName: sampleData.noteName,
        blob
      });
    }
  });
};
