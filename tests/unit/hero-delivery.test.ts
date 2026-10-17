import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import sharp from 'sharp';
import { heroPortrait } from '../../src/content/assets.ts';

test('the bounded hero delivery preserves dimensions, alpha and photographic detail', async () => {
  const bytes = await readFile('public'+heroPortrait.src);
  assert.ok(bytes.length <= 80*1024);
  assert.ok(heroPortrait.src.includes(createHash('sha256').update(bytes).digest('hex').slice(0,12)));
  const original = await sharp('public/images/mee.png').ensureAlpha().raw().toBuffer({resolveWithObject:true});
  const delivery = await sharp(bytes).ensureAlpha().raw().toBuffer({resolveWithObject:true});
  assert.equal(delivery.info.width,original.info.width);
  assert.equal(delivery.info.height,original.info.height);
  assert.equal(delivery.info.width,heroPortrait.width);
  assert.equal(delivery.info.height,heroPortrait.height);
  let squared = 0, count = 0;
  for(let offset=0;offset<original.data.length;offset+=4) {
    assert.equal(delivery.data[offset+3],original.data[offset+3]);
    if(original.data[offset+3]===255) for(let channel=0;channel<3;channel++) {
      squared += (original.data[offset+channel]-delivery.data[offset+channel])**2;
      count++;
    }
  }
  const psnr=10*Math.log10(255**2/(squared/count));
  assert.ok(psnr>=36,`Photographic fidelity fell to ${psnr.toFixed(2)} dB`);
});
