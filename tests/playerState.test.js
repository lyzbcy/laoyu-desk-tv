import {describe,it,expect} from 'vitest';
import model from '../src/core/playerState.js';
const {initialState,transition,viewState}=model;
describe('player audio and boss state',()=>{
 it('defaults mute, deliberate sound preference survives boss key',()=>{let s=initialState({muted:false,liveMuted:false});expect(viewState(s).effectiveLocalMuted).toBe(false);s=transition(s,{type:'toggle-boss'});expect(viewState(s).effectiveLocalMuted).toBe(true);expect(viewState(s).effectiveLiveMuted).toBe(true);s=transition(s,{type:'toggle-boss'});expect(viewState(s).effectiveLocalMuted).toBe(false);});
 it('hidden live view remains mute even if user enabled live sound',()=>{let s=initialState({liveMuted:false});expect(viewState(s).effectiveLiveMuted).toBe(true);s=transition(s,{type:'live',value:true});expect(viewState(s).effectiveLiveMuted).toBe(false);expect(viewState(s).effectiveLocalMuted).toBe(true);s=transition(s,{type:'live',value:false});expect(viewState(s).effectiveLiveMuted).toBe(true);});
 it('natural video end shares the same boss state; next key reveals instead of desynchronizing',()=>{let s=transition(initialState({}),{type:'ended'});expect(s.bossOn).toBe(true);s=transition(s,{type:'toggle-boss'});expect(s.bossOn).toBe(false);});
 it('changing preferred sound while disguised cannot leak audio',()=>{let s=transition(initialState({}),{type:'toggle-boss'});s=transition(s,{type:'live',value:true});s=transition(s,{type:'live-sound',value:true});expect(viewState(s).effectiveLiveMuted).toBe(true);expect(viewState(transition(s,{type:'toggle-boss'})).effectiveLiveMuted).toBe(false);});
});
