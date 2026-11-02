

import xxhash from "xxhash-wasm";
const str = "MissionChapterConfig_StageName_601071";

const hash = (await xxhash()).h64;

console.log(hash(str));