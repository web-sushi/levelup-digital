import { register } from "node:module";
import { pathToFileURL } from "node:url";

register(new URL("./inquiry-test-loader.mjs", import.meta.url).href, pathToFileURL("./"));
