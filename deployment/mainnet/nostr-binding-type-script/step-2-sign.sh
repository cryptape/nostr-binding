#!/bin/bash
ckb-cli --url https://mainnet.ckb.dev deploy sign-txs \
    --from-account ckb1qzda0cr08m85hc8jlnfp3zer7xulejywt49kt2rr0vthywaa50xwsqd7cexf2upwtfzyx66gtqur4mqf46d4wxs0q0fkh \
    --add-signatures \
    --info-file info.json
