const {sanitizeSummary}=require('./logger');
function crc32(bytes){let crc=0xffffffff;for(const byte of bytes){crc^=byte;for(let i=0;i<8;i++)crc=(crc>>>1)^((crc&1)?0xedb88320:0);}return (crc^0xffffffff)>>>0;}
// Two small, fixed-name, uncompressed ZIP entries; no third-party archive dependency.
function createDiagnosticArchive({version,platform,architecture,logs}){
 const safe=sanitizeSummary(logs),metadata={software:'Laoyu Desk TV',version,platform,architecture,logEntries:safe?safe.split('\n').length:0};
 const entries=[['about.json',JSON.stringify(metadata,null,2)],['diagnostics.jsonl',safe]],local=[],directory=[];let offset=0;
 for(const [name,text]of entries){const filename=Buffer.from(name),data=Buffer.from(text),crc=crc32(data),header=Buffer.alloc(30);header.writeUInt32LE(0x04034b50);header.writeUInt16LE(20,4);header.writeUInt16LE(33,12);header.writeUInt32LE(crc,14);header.writeUInt32LE(data.length,18);header.writeUInt32LE(data.length,22);header.writeUInt16LE(filename.length,26);local.push(header,filename,data);
  const central=Buffer.alloc(46);central.writeUInt32LE(0x02014b50);central.writeUInt16LE(20,4);central.writeUInt16LE(20,6);central.writeUInt16LE(33,14);central.writeUInt32LE(crc,16);central.writeUInt32LE(data.length,20);central.writeUInt32LE(data.length,24);central.writeUInt16LE(filename.length,28);central.writeUInt32LE(offset,42);directory.push(central,filename);offset+=header.length+filename.length+data.length;
 }
 const index=Buffer.concat(directory),end=Buffer.alloc(22);end.writeUInt32LE(0x06054b50);end.writeUInt16LE(entries.length,8);end.writeUInt16LE(entries.length,10);end.writeUInt32LE(index.length,12);end.writeUInt32LE(offset,16);return Buffer.concat([...local,index,end]);
}
module.exports={createDiagnosticArchive,crc32};
