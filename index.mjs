#!/usr/bin/env node

import { open } from 'node:fs/promises';
import json5 from 'json5';
import lodash from 'lodash';
const { set } = lodash;


const FILENAME = process.argv[2];
const OBJECTNAME = process.argv[3];

function fixKeys(input) {
  const output = {};

  function recurse(input, prefix = '') {
    for (const [key, value] of Object.entries(input)) {
      const path = prefix ? `${prefix}.${key}` : `${key}`;
      if (typeof value === 'object' && value !== null && value !== undefined) {
        recurse(value, path);
      } else if (typeof value === 'string') {
        if (value !== path) {
          console.log(`fixing ${path}: ${value} => ${path}`);
          set(output, path, path);
        }
      } else {
        throw Error(`Theme object had a non-valid entry at ${path}`);
      }
    }
  }

  recurse(input);
  return {...input, ...output};
}

const file = await open(FILENAME, 'r+');

const text = await file.readFile({ encoding: 'utf-8'});

const themeIdentifierIndex = text.indexOf(`const ${OBJECTNAME}`);

if (!themeIdentifierIndex) {
  throw Error(`could not find object ${OBJECTNAME} declaration`);
}

let objectStartIndex = themeIdentifierIndex;
while (text[objectStartIndex] !== '{') {
  objectStartIndex++;
}
let endingSemicolon = objectStartIndex;
while(text[endingSemicolon] !== ';') {
  endingSemicolon++;
}
const before = text.slice(0, objectStartIndex);
const jsonIn = text.slice(objectStartIndex, endingSemicolon);
const after = text.slice(endingSemicolon);

const object = json5.parse(jsonIn);
const fixed = fixKeys(object);
const jsonOut = json5.stringify(fixed, null, 2);
await file.write(before + jsonOut + after, 0);