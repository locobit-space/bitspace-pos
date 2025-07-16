<template>
  <div>
    <UButton color="purple" variant="solid" label="Hello" />
    dddd
  </div>
</template>

<script setup lang="ts">
import Crypto from "crypto-js";
onMounted(() => {
  const text = "hello worldxxx";
  const hash = Crypto.HmacSHA1(text, "secret key").toString();
  const encrypted = Crypto.AES.encrypt(text, "secret key").toString();
  console.log({ encrypted, hash });

  const decrypted = Crypto.AES.decrypt(encrypted, "secret key").toString(Crypto.enc.Utf8);
  const hash2 = Crypto.HmacSHA1(decrypted, "secret key").toString();
  console.log({ decrypted });

});
</script>

<style scoped></style>
