import fs from "node:fs";
import path from "node:path";
import ts from "typescript";

const root = process.cwd();
const appRoot = path.join(root, "app");
const extensions = new Set([".ts", ".tsx"]);
const findings = [];

function walk(directory) {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const fullPath = path.join(directory, entry.name);
    if (entry.isDirectory()) return walk(fullPath);
    return extensions.has(path.extname(entry.name)) ? [fullPath] : [];
  });
}

const checks = [
  ["em dash", /—|â€”/g],
  ["corrective contrast", /\b(?:is|are|was|were|do|does|did|can|could|will|would|should)\s+not\b[^.!?]{0,100}[.!?]\s+(?:It|They|This|That|Instead)\b/gi],
  ["contrast pivot", /\b(?:rather than|instead of|not merely|not only)\b/gi],
  ["stock conclusion", /\b(?:in conclusion|at the end of the day|ultimately,)\b/gi],
];

for (const filename of walk(appRoot)) {
  const sourceText = fs.readFileSync(filename, "utf8");
  const source = ts.createSourceFile(
    filename,
    sourceText,
    ts.ScriptTarget.Latest,
    true,
    filename.endsWith("x") ? ts.ScriptKind.TSX : ts.ScriptKind.TS,
  );

  function visit(node) {
    if (
      ts.isStringLiteral(node) ||
      ts.isNoSubstitutionTemplateLiteral(node) ||
      ts.isJsxText(node)
    ) {
      const value = node.text.trim();
      if (value.length >= 12) {
        const line = source.getLineAndCharacterOfPosition(node.getStart(source)).line + 1;
        for (const [label, pattern] of checks) {
          pattern.lastIndex = 0;
          if (pattern.test(value)) {
            findings.push({
              label,
              file: path.relative(root, filename).replaceAll("\\", "/"),
              line,
              sample: value.replace(/\s+/g, " ").slice(0, 150),
            });
          }
        }
        if (value.length > 260) {
          findings.push({
            label: "long copy",
            file: path.relative(root, filename).replaceAll("\\", "/"),
            line,
            sample: `${value.replace(/\s+/g, " ").slice(0, 150)}…`,
          });
        }
      }
    }
    ts.forEachChild(node, visit);
  }
  visit(source);
}

const totals = new Map();
for (const finding of findings) {
  totals.set(finding.label, (totals.get(finding.label) ?? 0) + 1);
}

console.log("Axiom Foundry copy-style audit");
for (const [label, count] of [...totals].sort()) {
  console.log(`${label}: ${count}`);
}

if (process.argv.includes("--details")) {
  for (const finding of findings) {
    console.log(`${finding.file}:${finding.line} [${finding.label}] ${finding.sample}`);
  }
}

const strict = process.argv.includes("--strict");
if (strict && findings.length > 0) {
  process.exitCode = 1;
}

