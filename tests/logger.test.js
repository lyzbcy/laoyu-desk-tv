import {it,expect} from 'vitest';import logger from '../src/core/logger.js';
it('diagnostics discard URLs, paths, tokens and arbitrary text',()=>{expect(logger.safeFields({version:'0.3.0',platform:'darwin',code:'ERR_FAILED',url:'https://secret',path:'C:/private',token:'key',source:'https://private'})).toEqual({version:'0.3.0',platform:'darwin',code:'ERR_FAILED'});});
