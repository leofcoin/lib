import Transaction from './transaction'
import ipldLfc from 'ipld-lfc';

const { LFCNode, util } = ipldLfc


/**
 * @extends {Transaction}
 * @example
 * const block = new Block()
 */
export default class Block extends Transaction {
  constructor() {
    super()
  }

  getDifficulty(hash) {
	   return parseInt(hash.substring(0, 8), 16);
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

  async validateBlock(previousBlock, block, difficulty, unspent) {
    const valid = await ipldLfc.util.isValid(block)
  	if (!valid) return await ipldLfc.util.validate(block)
  	// console.log(block, previousBlock);
  	if (previousBlock.index + 1 !== block.index) return this.BlockError('index');
    if (!previousBlock.hash) {
      previousBlock = await new LFCNode(previousBlock)
      previousBlock = previousBlock.toJSON()
      previousBlock.hash = await util.cid(util.serialize(previousBlock))
      previousBlock.hash = previousBlock.hash.toBaseEncodedString()
    }
    console.log(await this.blockHash(block), block.hash);
  	if (previousBlock.hash !== block.prevHash) throw this.BlockError('prevhash');
  	if (await this.blockHash(block) !== block.hash) return this.BlockError('hash');
  	if (this.getDifficulty(block.hash) > difficulty) return this.BlockError('difficulty');


  	return this.validateTransactions(block.transactions, unspent);
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
    const node = new LFCNode(block)
    return node;
  }
}
