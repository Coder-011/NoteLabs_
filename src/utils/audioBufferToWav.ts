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
  const ctx = new window.AudioContext();
  const arrayBuffer = await blob.arrayBuffer();
  const decodedBuffer = await ctx.decodeAudioData(arrayBuffer);

  const channelData = decodedBuffer.getChannelData(0);
  const threshold = 0.02; // Very low threshold for silence
  let endIndex = channelData.length - 1;

  // Find the end by scanning backwards
  while (endIndex > 0) {
    if (Math.abs(channelData[endIndex]) > threshold) {
      break;
    }
    endIndex--;
  }

  // Add 100ms tail to prevent abrupt cut
  const tailSamples = Math.floor(ctx.sampleRate * 0.1);
  endIndex = Math.min(channelData.length, endIndex + tailSamples);

  // If the sound is incredibly short, just keep a minimum
  if (endIndex < ctx.sampleRate * 0.5) {
    endIndex = Math.min(channelData.length, Math.floor(ctx.sampleRate * 0.5));
  }

  const trimmedCtx = new OfflineAudioContext(
    decodedBuffer.numberOfChannels,
    endIndex,
    decodedBuffer.sampleRate
  );

  const source = trimmedCtx.createBufferSource();
  source.buffer = decodedBuffer;
  source.connect(trimmedCtx.destination);
  source.start();

  const trimmedBuffer = await trimmedCtx.startRendering();
  
  // Close context to avoid memory leak
  ctx.close();

  return audioBufferToWavBlob(trimmedBuffer);
}
