import { rmSync } from "fs";
import { resolve } from "path";

const distPath = resolve(process.cwd(), "dist");
rmSync(distPath, { recursive: true, force: true });
