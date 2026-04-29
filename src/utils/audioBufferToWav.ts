export function audioBufferToWavBlob(buffer: AudioBuffer): Blob {
  const numOfChan = buffer.numberOfChannels;
  const length = buffer.length * numOfChan * 2 + 44;
  const bufferArray = new ArrayBuffer(length);
  const view = new DataView(bufferArray);
  const channels = [];
  let sample = 0;
  let offset = 0;
  let pos = 0;

  function setUint16(data: number) {
    view.setUint16(pos, data, true);
    pos += 2;
  }

  function setUint32(data: number) {
    view.setUint32(pos, data, true);
    pos += 4;
  }

  // write WAVE header
  setUint32(0x46464952);                         // "RIFF"
  setUint32(length - 8);                         // file length - 8
  setUint32(0x45564157);                         // "WAVE"
  setUint32(0x20746d66);                         // "fmt " chunk
  setUint32(16);                                 // length = 16
  setUint16(1);                                  // PCM (uncompressed)
  setUint16(numOfChan);
  setUint32(buffer.sampleRate);
  setUint32(buffer.sampleRate * 2 * numOfChan); // avg. bytes/sec
  setUint16(numOfChan * 2);                      // block-align
  setUint16(16);                                 // 16-bit (hardcoded in this demo)
  setUint32(0x61746164);                         // "data" - chunk
  setUint32(length - pos - 4);                   // chunk length

  for (let i = 0; i < buffer.numberOfChannels; i++) {
    channels.push(buffer.getChannelData(i));
  }

  while (pos < length) {
    for (let i = 0; i < numOfChan; i++) {
      sample = Math.max(-1, Math.min(1, channels[i][offset])); // clamp
      sample = (0.5 + sample < 0 ? sample * 32768 : sample * 32767) | 0; // scale to 16-bit
      view.setInt16(pos, sample, true);          // write 16-bit sample
      pos += 2;
    }
    offset++;
  }

  return new Blob([bufferArray], { type: 'audio/wav' });
}

export async function trimSilenceAndConvertToWav(blob: Blob): Promise<Blob> {
  const AudioContextClass = (window as any).AudioContext || (window as any).webkitAudioContext;
  const ctx = new AudioContextClass();
  
  try {
    // Use FileReader for maximum compatibility (Brave/Safari)
    const arrayBuffer = await new Promise<ArrayBuffer>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as ArrayBuffer);
      reader.onerror = reject;
      reader.readAsArrayBuffer(blob);
    });

    // Cross-browser decodeAudioData
    const decodedBuffer = await new Promise<AudioBuffer>((resolve, reject) => {
      ctx.decodeAudioData(arrayBuffer, resolve, reject);
    });

    const channelData = decodedBuffer.getChannelData(0);
    const threshold = 0.02; // Very low threshold for silence
    let endIndex = channelData.length - 1;
    let startIndex = 0;

    // Find the start by scanning forwards
    while (startIndex < channelData.length) {
      if (Math.abs(channelData[startIndex]) > threshold) {
        break;
      }
      startIndex++;
    }

    // Find the end by scanning backwards
    while (endIndex > startIndex) {
      if (Math.abs(channelData[endIndex]) > threshold) {
        break;
      }
      endIndex--;
    }

    // Add tail and head to prevent abrupt cut
    const tailSamples = Math.floor(ctx.sampleRate * 0.1);
    const headSamples = Math.floor(ctx.sampleRate * 0.05);
    
    startIndex = Math.max(0, startIndex - headSamples);
    endIndex = Math.min(channelData.length, endIndex + tailSamples);

    // Minimum length check
    if (endIndex - startIndex < ctx.sampleRate * 0.2) {
      endIndex = Math.min(channelData.length, startIndex + Math.floor(ctx.sampleRate * 0.2));
    }

    const length = endIndex - startIndex;
    const trimmedBuffer = ctx.createBuffer(
      decodedBuffer.numberOfChannels,
      length,
      decodedBuffer.sampleRate
    );

    // Copy data and apply small fades to prevent clicks
    const fadeSamples = Math.floor(decodedBuffer.sampleRate * 0.02); // 20ms fade

    for (let i = 0; i < decodedBuffer.numberOfChannels; i++) {
      const channelData = decodedBuffer.getChannelData(i);
      const trimmedData = trimmedBuffer.getChannelData(i);
      
      // Copy the segment
      trimmedData.set(channelData.subarray(startIndex, endIndex));

      // Apply Fade In
      for (let s = 0; s < Math.min(fadeSamples, length); s++) {
        trimmedData[s] *= (s / fadeSamples);
      }
      // Apply Fade Out
      for (let s = 0; s < Math.min(fadeSamples, length); s++) {
        trimmedData[length - 1 - s] *= (s / fadeSamples);
      }
    }
    
    ctx.close();
    return audioBufferToWavBlob(trimmedBuffer);
  } catch (err) {
    console.error('Trimming failed, returning original blob:', err);
    ctx.close();
    // Fallback: convert original blob to WAV if possible, or just return as is
    return blob; 
  }
}
