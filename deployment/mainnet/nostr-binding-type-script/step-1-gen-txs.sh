#!/bin/bash
set -ex
cd ../.. && shasum -a 256 -c checksums.txt && cd -

ckb-cli deploy gen-txs \
    --deployment-config ./deployment.toml \
    --migration-dir ./migrations \
    --fee-rate 1600 \
    --from-address ckb1qzda0cr08m85hc8jlnfp3zer7xulejywt49kt2rr0vthywaa50xwsqw9zyl653xlmzkkwmkguk0sqxkalkyat8suxxefv \
    --info-file info.json
