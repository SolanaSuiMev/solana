import { Layout, struct, u8, UInt } from '@solana/buffer-layout';
import { u64 } from '@solana/buffer-layout-utils';
import * as solanaWeb3 from '@solana/web3.js';
import { Connection, PublicKey, Logs, Context } from '@solana/web3.js';
import BN from 'bn.js';

// 使用提供的 RPC endpoint
const HTTP_ENDPOINT = 'https://solana-mainnet.g.alchemy.com/v2/rQOGAyja0yJrQgWFtMjil2oyMcoOHU4i';
const WSS_ENDPOINT = 'wss://mainnet.helius-rpc.com/?api-key=4ab98a38-2d25-4ad4-bf15-50c935e38520';
const solanaConnection = new Connection(HTTP_ENDPOINT,{wsEndpoint:WSS_ENDPOINT});

async function getBlock() {
    try {
      // 获取最新的 slot
      const latestSlot = await solanaConnection.getSlot();
      console.log(`最新 slot：${latestSlot}`);
  
      // 根据 slot 获取区块详细信息
      const blockInfo = await solanaConnection.getBlock(latestSlot, { maxSupportedTransactionVersion: 0 });
      if (blockInfo) {
        console.log('最新区块信息：', blockInfo);
      } else {
        console.log('无法获取当前 slot 的区块信息（可能尚未确认或不可用）');
      }
    } catch (error) {
      console.error('获取区块信息时出错:', error);
    }
}

const sleep = (ms:number) => {
    return new Promise(resolve => setTimeout(resolve, ms));
}

// Listen to raydium router events
// routeUGWgWzqBWFcrCfv8tritsqukccJPu3q5GPP3xS
// 拿到raydium合约所有的swap日志 
async function getRouterLogs(): Promise<void> {
    // Raydium swap router 的地址
    // 1. 合约地址 
    const RAYDIUM_PROGRAM_ID = 'routeUGWgWzqBWFcrCfv8tritsqukccJPu3q5GPP3xS';
    const routerAddress = new PublicKey(RAYDIUM_PROGRAM_ID);
  
    console.log('开始监听 Raydium Swap Router 日志事件...');
  
    // 2. 需要清楚合约发出的日志名字
    solanaConnection.onLogs(
      routerAddress,
      async ({ logs, signature }) => {
        if (logs.some(log => log.includes("swap"))) {
            console.log("Swap detected. Signature:", signature);

            const txDetails = await solanaConnection.getParsedTransaction(signature, {
                commitment: "confirmed",
                maxSupportedTransactionVersion: 0
            });

            if (txDetails) {
                console.log("Transaction details:", txDetails);
                for (const instruction of txDetails.transaction.message.instructions) {
                    if (instruction.programId.toBase58() === RAYDIUM_PROGRAM_ID) {
                        console.log("Raydium swap instruction found!");
                        if (instruction && typeof instruction === 'object' && 'data' in instruction) {
                            console.log("Instruction data:", instruction.data);
                            
                            // const decoded = decodeRaydiumInstruction(instruction.data);
                            // console.log("Decoded Data:", decoded);
                            // return;
                        }
                    }
                }
            }
        }
    },
      'confirmed'
    );
}

interface RaydiumInstructionData {
    instructionType: number;
    amountIn: bigint;
    amountOut: bigint;
}
  
const decodeRaydiumInstruction = (data: string): {
instructionType: number;
amountIn: string;
amountOut: string;
} => {
    const layout: Layout<RaydiumInstructionData> = struct([
      u8('instructionType'),
      u64('amountIn'),
      u64('amountOut'),
    ]);
  
    const decoded = layout.decode(Buffer.from(data, "base64"));
    return {
      instructionType: decoded.instructionType,
      amountIn: new BN(decoded.amountIn.toString()).toString(),
      amountOut: new BN(decoded.amountOut.toString()).toString(),
    };
};
  



async function main() {
    // await getBlock();
    getRouterLogs().catch((error) => {
        console.error('监听日志时出错:', error);
    });
}

main();
