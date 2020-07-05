import Transaction from './transaction'
import ipldLfc from 'ipld-lfc';

const { LFCNode } = ipldLfc

export default class Block extends Transaction {
  constructor() {
    super()
  }
  
  
  goodBlock(block, difficulty){
    return new Promise(async (resolve, reject) => {
      block.hash = await this.blockHash(block);
      if (parseInt(block.hash.substring(0, 8), 16) >= difficulty) {
        block.nonce++
        block = await this.goodBlock(block, difficulty)
      }      
      resolve(block)
    })
  }
  
  /**
   * Create a new genesis block
   */
  async newGenesisDAGNode(difficulty = 1, address = Buffer.alloc(32).toString('hex')) {
    let block = {
      index: 0,
      prevHash: Buffer.alloc(47).toString('hex'),
      time: Math.floor(new Date().getTime() / 1000),
      transactions: [
        // ms.unspent(network, [], wallet.account()).create(index: 0, amount: consensusSubsidy(0), address)
      ],
      nonce: 0
    }
    block.hash = await blockHash(block);
    block = await this.goodBlock(block, difficulty)
    console.log({block});
    const node = new LFCNode(block)
    return node;
  }
}