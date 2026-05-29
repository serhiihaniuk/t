import { existsSync, readdirSync, readFileSync, statSync } from "node:fs"
import { extname, join, relative, sep } from "node:path"

const ROOT = process.cwd()
const IGNORED_DIRECTORIES = new Set([
  ".git",
  ".next",
  "build",
  "coverage",
  "dist",
  "node_modules",
  "playwright-report",
  "test-results",
])
const SOURCE_EXTENSIONS = new Set([
  ".cjs",
  ".cts",
  ".js",
  ".jsx",
  ".mjs",
  ".mts",
  ".ts",
  ".tsx",
])
const MARKDOWN_EXTENSIONS = new Set([".md"])

const FILE_LINE_BUDGETS = {
  MARKDOWN: 650,
  SOURCE: 300,
  TEST: 450,
}

const files = listFiles(ROOT)
const violations = files
  .map((filePath) => {
    const kind = getFileKind(filePath)

    if (!kind) {
      return undefined
    }

    const lineCount = countLines(filePath)
    const maxLines = FILE_LINE_BUDGETS[kind]

    if (lineCount <= maxLines) {
      return undefined
    }

    return {
      lineCount,
      maxLines,
      path: normalizePath(filePath),
    }
  })
  .filter(Boolean)

if (violations.length > 0) {
  console.error(
    "File size limit failed. Split large files instead of adding exceptions."
  )
  violations.forEach((violation) => {
    console.error(
      `- ${violation.path}: ${violation.lineCount} lines exceeds ${violation.maxLines}`
    )
  })
  process.exitCode = 1
}

function listFiles(directory) {
  if (!existsSync(directory)) {
    return []
  }

  return readdirSync(directory).flatMap((entry) => {
    if (IGNORED_DIRECTORIES.has(entry)) {
      return []
    }

    const entryPath = join(directory, entry)
    const stats = statSync(entryPath)

    if (stats.isDirectory()) {
      return listFiles(entryPath)
    }

    return stats.isFile() ? [entryPath] : []
  })
}

function getFileKind(filePath) {
  const extension = extname(filePath)

  if (SOURCE_EXTENSIONS.has(extension)) {
    return isTestFile(filePath) ? "TEST" : "SOURCE"
  }

  if (MARKDOWN_EXTENSIONS.has(extension)) {
    return "MARKDOWN"
  }

  return undefined
}

function isTestFile(filePath) {
  const normalizedPath = normalizePath(filePath)

  return (
    normalizedPath.includes(".test.") ||
    normalizedPath.includes(".spec.") ||
    normalizedPath.startsWith("e2e/") ||
    normalizedPath.startsWith("test/")
  )
}

function countLines(filePath) {
  const source = readFileSync(filePath, "utf8")

  if (source.length === 0) {
    return 0
  }

  return source.split(/\r\n|\n|\r/).length
}

function normalizePath(filePath) {
  return relative(ROOT, filePath).split(sep).join("/")
}
