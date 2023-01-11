export enum ChainId {
  MAINNET = 1,
  OPTIMISM = 10,
  ARBITRUM = 42161,
  BOBA = 288,
  POLYGON = 137,
  // testnets
  GOERLI = 5,
  MUMBAI = 80001,
}

// NOTE: All addresses should be checksummed
export const TOKEN_SYMBOLS_MAP = {
  ACX: {
    name: "ACX",
    symbol: "ACX",
    decimals: 18,
    addresses: {
      [ChainId.MAINNET]: "0x44108f0223A3C3028F5Fe7AEC7f9bb2E66beF82F",
      [ChainId.OPTIMISM]: "0xFf733b2A3557a7ed6697007ab5D11B79FdD1b76B",
      [ChainId.POLYGON]: "0xF328b73B6c685831F238c30a23Fc19140CB4D8FC",
      [ChainId.BOBA]: "0x96821b258955587069F680729cD77369C0892B40",
      [ChainId.ARBITRUM]: "0x53691596d1BCe8CEa565b84d4915e69e03d9C99d",
      [ChainId.GOERLI]: "0x40153DdFAd90C49dbE3F5c9F96f2a5B25ec67461",
    },
  },
  BAL: {
    name: "Balancer",
    symbol: "BAL",
    decimals: 18,
    addresses: {
      [ChainId.MAINNET]: "0xba100000625a3754423978a60c9317c58a424e3D",
      [ChainId.OPTIMISM]: "0xFE8B128bA8C78aabC59d4c64cEE7fF28e9379921",
      [ChainId.POLYGON]: "0x9a71012B13CA4d3D0Cdc72A177DF3ef03b0E76A3",
      [ChainId.ARBITRUM]: "0x040d1EdC9569d4Bab2D15287Dc5A4F10F56a56B8",
    },
  },
  BADGER: {
    name: "Badger",
    symbol: "BADGER",
    decimals: 18,
    addresses: {
      [ChainId.MAINNET]: "0x3472A5A71965499acd81997a54BBA8D852C6E53d",
      [ChainId.POLYGON]: "0x1FcbE5937B0cc2adf69772D228fA4205aCF4D9b2",
      [ChainId.ARBITRUM]: "0xBfa641051Ba0a0Ad1b0AcF549a89536A0D76472E",
    },
  },
  BOBA: {
    name: "Boba",
    symbol: "BOBA",
    decimals: 18,
    addresses: {
      [ChainId.MAINNET]: "0x42bBFa2e77757C645eeaAd1655E0911a7553Efbc",
      [ChainId.BOBA]: "0xa18bF3994C0Cc6E3b63ac420308E5383f53120D7",
    },
  },
  DAI: {
    name: "Dai Stablecoin",
    symbol: "DAI",
    decimals: 18,
    addresses: {
      [ChainId.MAINNET]: "0x6B175474E89094C44Da98b954EedeAC495271d0F",
      [ChainId.OPTIMISM]: "0xDA10009cBd5D07dd0CeCc66161FC93D7c9000da1",
      [ChainId.POLYGON]: "0x8f3Cf7ad23Cd3CaDbD9735AFf958023239c6A063",
      [ChainId.BOBA]: "0xf74195Bb8a5cf652411867c5C2C5b8C2a402be35",
      [ChainId.ARBITRUM]: "0xDA10009cBd5D07dd0CeCc66161FC93D7c9000da1",
      [ChainId.GOERLI]: "0x5C221E77624690fff6dd741493D735a17716c26B",
    },
  },
  ETH: {
    name: "Ether",
    symbol: "ETH",
    decimals: 18,
    addresses: {
      [ChainId.MAINNET]: "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2",
      [ChainId.OPTIMISM]: "0x4200000000000000000000000000000000000006",
      [ChainId.POLYGON]: "0x7ceB23fD6bC0adD59E62ac25578270cFf1b9f619",
      [ChainId.BOBA]: "0xDeadDeAddeAddEAddeadDEaDDEAdDeaDDeAD0000",
      [ChainId.ARBITRUM]: "0x82aF49447D8a07e3bd95BD0d56f35241523fBab1",
      [ChainId.GOERLI]: "0xB4FBF271143F4FBf7B91A5ded31805e42b2208d6",
    },
  },
  MATIC: {
    name: "Matic",
    symbol: "MATIC",
    decimals: 18,
    addresses: {
      [ChainId.MAINNET]: "0x7D1AfA7B718fb893dB30A3aBc0Cfc608AaCfeBB0",
      [ChainId.GOERLI]: "0x499d11E0b6eAC7c0593d8Fb292DCBbF815Fb29Ae",
      [ChainId.MUMBAI]: "0x9c3C9283D3e44854697Cd22D3Faa240Cfb032889",
    },
  },
  UMA: {
    name: "UMA",
    symbol: "UMA",
    decimals: 18,
    addresses: {
      [ChainId.MAINNET]: "0x04Fa0d235C4abf4BcF4787aF4CF447DE572eF828",
      [ChainId.OPTIMISM]: "0xE7798f023fC62146e8Aa1b36Da45fb70855a77Ea",
      [ChainId.POLYGON]: "0x3066818837c5e6eD6601bd5a91B0762877A6B731",
      [ChainId.BOBA]: "0x780f33Ad21314d9A1Ffb6867Fe53d48a76Ec0D16",
      [ChainId.ARBITRUM]: "0xd693Ec944A85eeca4247eC1c3b130DCa9B0C3b22",
    },
  },
  USDC: {
    name: "USD Coin",
    symbol: "USDC",
    decimals: 6,
    addresses: {
      [ChainId.MAINNET]: "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48",
      [ChainId.OPTIMISM]: "0x7F5c764cBc14f9669B88837ca1490cCa17c31607",
      [ChainId.POLYGON]: "0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174",
      [ChainId.BOBA]: "0x66a2A913e447d6b4BF33EFbec43aAeF87890FBbc",
      [ChainId.ARBITRUM]: "0xFF970A61A04b1cA14834A43f5dE4533eBDDB5CC8",
      [ChainId.GOERLI]: "0xd35CCeEAD182dcee0F148EbaC9447DA2c4D449c4",
      [ChainId.MUMBAI]: "0xe6b8a5CF854791412c1f6EFC7CAf629f5Df1c747",
    },
  },
  USDT: {
    name: "USDT",
    symbol: "USDT",
    decimals: 6,
    addresses: {
      [ChainId.MAINNET]: "0xdAC17F958D2ee523a2206206994597C13D831ec7",
      [ChainId.OPTIMISM]: "0x94b008aA00579c1307B0EF2c499aD98a8ce58e58",
      [ChainId.POLYGON]: "0xc2132D05D31c914a87C6611C10748AEb04B58e8F",
      [ChainId.BOBA]: "0x5DE1677344D3Cb0D7D465c10b72A8f60699C062d",
      [ChainId.ARBITRUM]: "0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9",
    },
  },
  WBTC: {
    name: "Wrapped Bitcoin",
    symbol: "WBTC",
    decimals: 8,
    addresses: {
      [ChainId.MAINNET]: "0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599",
      [ChainId.OPTIMISM]: "0x68f180fcCe6836688e9084f035309E29Bf0A2095",
      [ChainId.POLYGON]: "0x1BFD67037B42Cf73acF2047067bd4F2C47D9BfD6",
      [ChainId.BOBA]: "0xdc0486f8bf31DF57a952bcd3c1d3e166e3d9eC8b",
      [ChainId.ARBITRUM]: "0x2f2a2543B76A4166549F7aaB2e75Bef0aefC5B0f",
    },
  },
  WETH: {
    name: "Wrapped Ether",
    symbol: "WETH",
    decimals: 18,
    addresses: {
      [ChainId.MAINNET]: "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2",
      [ChainId.OPTIMISM]: "0x4200000000000000000000000000000000000006",
      [ChainId.POLYGON]: "0x7ceB23fD6bC0adD59E62ac25578270cFf1b9f619",
      [ChainId.BOBA]: "0xDeadDeAddeAddEAddeadDEaDDEAdDeaDDeAD0000",
      [ChainId.ARBITRUM]: "0x82aF49447D8a07e3bd95BD0d56f35241523fBab1",
      [ChainId.GOERLI]: "0xB4FBF271143F4FBf7B91A5ded31805e42b2208d6",
    },
  },
  WMATIC: {
    name: "Matic",
    symbol: "WMATIC",
    decimals: 18,
    addresses: {
      [ChainId.MAINNET]: "0x7D1AfA7B718fb893dB30A3aBc0Cfc608AaCfeBB0",
      [ChainId.GOERLI]: "0x499d11E0b6eAC7c0593d8Fb292DCBbF815Fb29Ae",
      [ChainId.MUMBAI]: "0x9c3C9283D3e44854697Cd22D3Faa240Cfb032889",
    },
  },
};
