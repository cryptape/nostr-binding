
#!/bin/bash
cd ../.. && shasum -a 256 -c checksums.txt && cd deployment/nostr-binding-type-script

ckb-cli deploy gen-txs \
    --deployment-config ./deployment.toml \
    --migration-dir ./migrations \
    --fee-rate 1600 \
    --from-address ckt1qzda0cr08m85hc8jlnfp3zer7xulejywt49kt2rr0vthywaa50xwsqvuyep8kue7r8mhfe6rzguzj3kmj4yqjwsg8lepn \
    --info-file info.json
