import { fileURLToPath } from "node:url";
import { checkCatalog } from "./lib/photo-catalog.mjs";

try {
  const result = await checkCatalog(fileURLToPath(new URL("../", import.meta.url)));
  console.log(`Photos: ${result.published}/${result.photos} published, ${result.files} images, ${(result.bytes / 1024 / 1024).toFixed(2)} MiB. Catalog valid.`);
} catch (error) {
  console.error(`Photo check failed: ${error.message}`);
  process.exitCode = 1;
}
