#!/bin/bash
ckb-cli tx build-multisig-address \
  --sighash-address ckb1qzda0cr08m85hc8jlnfp3zer7xulejywt49kt2rr0vthywaa50xwsq2gf4ffz0rp6zs8wefsqz9kx4ae8exshugpnkqha \
  --sighash-address ckb1qzda0cr08m85hc8jlnfp3zer7xulejywt49kt2rr0vthywaa50xwsqv8rhlzfvjl22jhg6j7046x9a6xph3vvwq2luq73 \
  --sighash-address ckb1qzda0cr08m85hc8jlnfp3zer7xulejywt49kt2rr0vthywaa50xwsq0m2fr3ygwszxa77l5r7utgku85wyqvjac5wppfj \
  --threshold 2 \
  --require-first-n 0 \
  --multisig-code-hash 0x5c5069eb0857efc65e1bca0c07df34c31663b3622fd3876c876320fc9634e2a8
