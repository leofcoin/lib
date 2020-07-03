const test = require('tape');
const LfcApi = require('lfc-api');
const { block, chain, error, hash, params, transaction, validate } = require('./../index');

const address = '8HFTVVfRMeL1sASrsdp6mvqDW9pvSD4AKySPEq3So16Wo1mpgY';


(async () => {
  const api = await new LfcApi()
  
  chain.chain.push({
    hash: 'zsNS6wZiHSg79zrD4dbWFgS1tf9vsVHtLAmPDHsm9QqmFujiALQGzGrJGjFB7rgjQyWZb1EaKyrGKN7K1y1Btv2sxqtffy',
    index: 1,
    nonce: 263991677,
    prevHash: 'zsNS6wZiHSc2QPHmjV8TMNn798b4Kp9jpjsBNeUkPhaJTza3GosWUgE72Jy3X9jKMrFCcDni7Pq4yXogQN4TcAfrPmTXFt',
    time: 1590242832,
    transactions: [{
      id: 'f83349fbde4098c9be72be87468265d7ae43de8137fec514e3b81adbd8ff1c9d',
      inputs: [],
      outputs: [{
        address: '8HFTVVfRMeL1sASrsdp6mvqDW9pvSD4AKySPEq3So16Wo1mpgY',
        amount: 150,
        index: 0
      }],
      reward: '',
      script: 'mined',
      time: 1590242832
    }]    
  })
  
  // test('block', tape => {
  //   tape.plan(1)
  // 
  //   tape.equals('block')
  // })
  const testChain = () => new Promise((resolve, reject) => {
    test('chain', async tape => {
      tape.plan(14)
      
      let value = await chain.getTransactions()
      tape.equals(value.length, 1, 'getTransactions')
      
      value = await chain.getTransactions(false, 1)
      tape.equals(value.length, 0, 'getTransactions after block 1')
      
      value = await chain.getTransactionsForAddress(address)
      tape.equals(value.length, 1, 'getTransactionsForAddress')
      
      value = await chain.getTransactionsForAddress(address, 1)
      tape.equals(value.length, 0, 'getTransactionsForAddress after block 1')
      
      value = await chain.getUnspent(address)
      tape.equals(value.length, 1, 'getUnspent')
      
      value = await chain.getUnspentForAddress(address)
      tape.equals(value.length, 1, 'getUnspentForAddress')
      
      value = await chain.getBalanceForAddress(address)
      tape.equals(value, 150, 'getBalanceForAddress')
      
      value = await chain.getBalanceForAddress(address, 1)
      tape.equals(value, 0, 'getBalanceForAddress after block 1')
      
      value = await chain.nextBlockTransactions()
      tape.equals(value.length, 0, 'nextBlockTransactions')
      
      value = await chain.longestChain()
      tape.equals(value.index, 0, 'longestChain')
      
      value = await chain.lastBlock()
      tape.equals(value.index, 0, 'lastBlock')
      
      value = await chain.nextBlock('8HFTVVfRMeL1sASrsdp6mvqDW9pvSD4AKySPEq3So16Wo1mpgY')
      tape.equals(value.transactions[0].reward, 'mined', 'nextBlock')
      
      const hash = value.hash
      
      value = await chain.blockHash(value)
      tape.equals(value, hash, 'blockHash')
      
      value = await chain.transactionHash(chain.chain[1].transactions[0])
      tape.equals(value, 'z3vzxp8fU86s1epQKDDs762iscaKJU16ra3BkR86bJQb8jSGrnC', 'transactionHash')
      
      setTimeout(function () {
        resolve()
      }, 200);
    })
  });
  await testChain()
  process.exit(0)
  
  
})()