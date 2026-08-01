import { access, cp, mkdir, readdir, rm } from "node:fs/promises";
import { join, resolve } from "node:path";
import type { Plugin } from "vite";

async function exists(path: string): Promise<boolean> {
  try {
    await access(path);
    return true;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      return false;
    }
    throw error;
  }
}

async function removeServerPublicCopies(
  root: string,
  publicDirectory: string,
  relativeDirectory = "",
) {
  const directory = join(publicDirectory, relativeDirectory);
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const relativePath = join(relativeDirectory, entry.name);
    if (entry.isDirectory()) {
      await removeServerPublicCopies(root, publicDirectory, relativePath);
      continue;
    }
    await Promise.all([
      rm(resolve(root, "dist", "server", relativePath), { force: true }),
      rm(resolve(root, "dist", "server", "ssr", relativePath), {
        force: true,
      }),
    ]);
  }
}

// Packages Sites metadata and migrations after Vite finishes compiling.
export function sites(): Plugin {
  let root = process.cwd();

  return {
    name: "sites",
    apply: "build",
    configResolved(config) {
      root = config.root;
    },
    async closeBundle() {
      const outputDirectory = resolve(root, "dist", ".openai");
      const hostingConfig = resolve(root, ".openai", "hosting.json");
      const drizzleSource = resolve(root, "drizzle");
      const publicDirectory = resolve(root, "public");

      await rm(outputDirectory, { recursive: true, force: true });
      await mkdir(outputDirectory, { recursive: true });

      if (await exists(hostingConfig)) {
        await cp(hostingConfig, resolve(outputDirectory, "hosting.json"));
      }
      if (await exists(drizzleSource)) {
        await cp(drizzleSource, resolve(outputDirectory, "drizzle"), {
          recursive: true,
        });
      }
      if (await exists(publicDirectory)) {
        await removeServerPublicCopies(root, publicDirectory);
      }
    },
  };
}
