import {it,expect} from 'vitest';import g from '../src/core/windowGeometry.js';
const displays=[{id:1,workArea:{x:0,y:24,width:1440,height:800}},{id:2,workArea:{x:-1920,y:40,width:1920,height:1000}}];
it('new Mac window respects menu bar/work area offset',()=>{const b=g.windowBounds({},displays,1);expect(b).toEqual({x:1060,y:484,width:360,height:320});});
it('remembers negative-coordinate secondary monitor and clamps huge dimensions',()=>{const b=g.windowBounds({x:-1800,y:50,width:3000,height:2000},displays,1);expect(b.x).toBe(-1920);expect(b.y).toBe(40);expect(b.width).toBe(1920);expect(b.height).toBe(1000);});
it('disconnected monitor position is restored to primary visible area',()=>{const b=g.windowBounds({x:5000,y:3000,width:360,height:640},displays,1);expect(b.x+b.width).toBeLessThanOrEqual(1440);expect(b.y+b.height).toBeLessThanOrEqual(824);});
it('setup centers on the existing secondary display work area',()=>{expect(g.windowBounds({x:-1700,y:100},displays,1,true)).toEqual({x:-1560,y:140,width:1200,height:800});});
