import type { SF2ParsedData, SF2Preset, SF2Generator, SF2SampleHeader } from '../types';

export function parseSF2(buffer: ArrayBuffer): SF2ParsedData {
  const view = new DataView(buffer);

  function tag(offset: number): string {
    return String.fromCharCode(
      view.getUint8(offset), view.getUint8(offset + 1),
      view.getUint8(offset + 2), view.getUint8(offset + 3)
    );
  }

  if (tag(0) !== 'RIFF') throw new Error('Not a RIFF file');
  if (tag(8) !== 'sfbk') throw new Error('Not an SF2 file');

  const chunks = new Map<string, { offset: number; size: number }>();

  let pos = 12;
  const fileEnd = buffer.byteLength;

  while (pos < fileEnd - 8) {
    const chunkId = tag(pos);
    const chunkSize = view.getUint32(pos + 4, true);
    const dataStart = pos + 8;

    if (chunkId === 'LIST') {
      // const listType = tag(dataStart);
      let subPos = dataStart + 4;
      const subEnd = dataStart + chunkSize;
      while (subPos < subEnd - 8) {
        const subId = tag(subPos);
        const subSize = view.getUint32(subPos + 4, true);
        chunks.set(subId, { offset: subPos + 8, size: subSize });
        subPos += 8 + subSize + (subSize & 1);
      }
    }

    pos = dataStart + chunkSize + (chunkSize & 1);
  }

  function require(id: string) {
    const c = chunks.get(id);
    if (!c) throw new Error(`SF2 missing chunk: ${id}`);
    return c;
  }

  function readString(offset: number, maxLen: number): string {
    let s = '';
    for (let i = 0; i < maxLen; i++) {
      const c = view.getUint8(offset + i);
      if (c === 0) break;
      s += String.fromCharCode(c);
    }
    return s.trim();
  }

  // Parse phdr (preset headers, 38 bytes each)
  const phdrChunk = require('phdr');
  const presetsRaw: SF2Preset[] = [];
  const phdrCount = Math.floor(phdrChunk.size / 38);
  for (let i = 0; i < phdrCount; i++) {
    const base = phdrChunk.offset + i * 38;
    presetsRaw.push({
      name: readString(base, 20),
      program: view.getUint16(base + 20, true),
      bank: view.getUint16(base + 22, true),
      bagIndex: view.getUint16(base + 24, true),
      index: i,
    });
  }
  // Last entry is terminal EOP sentinel
  const presets = presetsRaw.slice(0, -1);

  // Parse pbag (preset bags, 4 bytes each)
  const pbagChunk = require('pbag');
  const presetBags: Array<{ genNdx: number; modNdx: number }> = [];
  const pbagCount = Math.floor(pbagChunk.size / 4);
  for (let i = 0; i < pbagCount; i++) {
    const base = pbagChunk.offset + i * 4;
    presetBags.push({
      genNdx: view.getUint16(base, true),
      modNdx: view.getUint16(base + 2, true),
    });
  }

  // Parse pgen (preset generators, 4 bytes each)
  const pgenChunk = require('pgen');
  const presetGens: SF2Generator[] = [];
  const pgenCount = Math.floor(pgenChunk.size / 4);
  for (let i = 0; i < pgenCount; i++) {
    const base = pgenChunk.offset + i * 4;
    presetGens.push({
      oper: view.getUint16(base, true),
      amount: view.getUint16(base + 2, true),
      amountLo: view.getUint8(base + 2),
      amountHi: view.getUint8(base + 3),
    });
  }

  // Parse inst (instrument headers, 22 bytes each)
  const instChunk = require('inst');
  const instrumentsRaw: Array<{ name: string; bagIndex: number }> = [];
  const instCount = Math.floor(instChunk.size / 22);
  for (let i = 0; i < instCount; i++) {
    const base = instChunk.offset + i * 22;
    instrumentsRaw.push({
      name: readString(base, 20),
      bagIndex: view.getUint16(base + 20, true),
    });
  }
  const instruments = instrumentsRaw.slice(0, -1);

  // Parse ibag (instrument bags, 4 bytes each)
  const ibagChunk = require('ibag');
  const instrumentBags: Array<{ genNdx: number; modNdx: number }> = [];
  const ibagCount = Math.floor(ibagChunk.size / 4);
  for (let i = 0; i < ibagCount; i++) {
    const base = ibagChunk.offset + i * 4;
    instrumentBags.push({
      genNdx: view.getUint16(base, true),
      modNdx: view.getUint16(base + 2, true),
    });
  }

  // Parse igen (instrument generators, 4 bytes each)
  const igenChunk = require('igen');
  const instrumentGens: SF2Generator[] = [];
  const igenCount = Math.floor(igenChunk.size / 4);
  for (let i = 0; i < igenCount; i++) {
    const base = igenChunk.offset + i * 4;
    instrumentGens.push({
      oper: view.getUint16(base, true),
      amount: view.getUint16(base + 2, true),
      amountLo: view.getUint8(base + 2),
      amountHi: view.getUint8(base + 3),
    });
  }

  // Parse shdr (sample headers, 46 bytes each)
  const shdrChunk = require('shdr');
  const sampleHeaders: SF2SampleHeader[] = [];
  const shdrCount = Math.floor(shdrChunk.size / 46);
  for (let i = 0; i < shdrCount - 1; i++) {
    const base = shdrChunk.offset + i * 46;
    sampleHeaders.push({
      name: readString(base, 20),
      start: view.getUint32(base + 20, true),
      end: view.getUint32(base + 24, true),
      loopStart: view.getUint32(base + 28, true),
      loopEnd: view.getUint32(base + 32, true),
      sampleRate: view.getUint32(base + 36, true),
      originalPitch: view.getUint8(base + 40),
      pitchCorrection: view.getInt8(base + 41),
      sampleType: view.getUint16(base + 44, true),
    });
  }

  // smpl chunk: raw Int16 PCM
  const smplChunk = require('smpl');

  return {
    presets,
    presetBags,
    presetGens,
    instruments,
    instrumentBags,
    instrumentGens,
    sampleHeaders,
    sampleDataBuffer: buffer,
    sampleDataOffset: smplChunk.offset,
  };
}
