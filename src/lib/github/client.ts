const GITHUB_API_BASE = 'https://api.github.com'

const headers: HeadersInit = {
  Accept: 'application/vnd.github+json',
  'X-GitHub-Api-Version': '2022-11-28',
}

export interface TreeItem {
  path: string
  type: 'blob' | 'tree'
  sha: string
}

export interface FileContent {
  path: string
  content: string
  encoding: string
}

export async function fetchTree(
  owner: string,
  repo: string,
  path: string = '',
): Promise<TreeItem[]> {
  const url = `${GITHUB_API_BASE}/repos/${owner}/${repo}/contents/${path}`
  const res = await fetch(url, { headers })

  // Large repos (e.g. vercel/next.js) return 403 on root via Contents API.
  if ((res.status === 403 || res.status === 404) && path === '') {
    return fetchRootViaTreesApi(owner, repo)
  }

  if (res.status === 404) {
    throw new Error(`Repository or path not found: ${owner}/${repo}/${path}`)
  }
  if (res.status === 403) {
    throw new Error('GitHub rate limit reached. Please wait a few minutes.')
  }
  if (!res.ok) {
    throw new Error(`GitHub API error: ${res.status}`)
  }

  const data = await res.json()

  if (!Array.isArray(data)) {
    throw new Error(`Path is a file, not a directory: ${path}`)
  }

  return data.map((item: any) => ({
    path: item.path,
    type: item.type === 'dir' ? 'tree' : 'blob',
    sha: item.sha,
  }))
}

async function fetchRootViaTreesApi(
  owner: string,
  repo: string,
): Promise<TreeItem[]> {
  // First get the default branch SHA
  const repoRes = await fetch(`${GITHUB_API_BASE}/repos/${owner}/${repo}`, {
    headers,
  })
  if (!repoRes.ok)
    throw new Error(`Could not fetch repo metadata: ${repoRes.status}`)
  const repoData = await repoRes.json()
  const branch = repoData.default_branch ?? 'main'

  const treeRes = await fetch(
    `${GITHUB_API_BASE}/repos/${owner}/${repo}/git/trees/${branch}`,
    { headers },
  )
  if (!treeRes.ok) throw new Error(`Git Trees API error: ${treeRes.status}`)
  const treeData = await treeRes.json()

  return (treeData.tree as any[])
    .slice(0, 100) // cap — root of next.js has 50+ items, this is plenty
    .map((item: any) => ({
      path: item.path,
      type: item.type === 'tree' ? 'tree' : 'blob',
      sha: item.sha,
    }))
}

export async function fetchFile(
  owner: string,
  repo: string,
  path: string,
): Promise<FileContent> {
  const url = `${GITHUB_API_BASE}/repos/${owner}/${repo}/contents/${path}`
  const res = await fetch(url, { headers })

  if (res.status === 404) {
    throw new Error(`File not found: ${path}`)
  }
  if (res.status === 403) {
    throw new Error('GitHub rate limit reached. Please wait a few minutes.')
  }
  if (!res.ok) {
    throw new Error(`GitHub API error: ${res.status}`)
  }

  const data = await res.json()

  if (data.encoding !== 'base64') {
    throw new Error(`Unexpected encoding: ${data.encoding}`)
  }

  const decoded = Buffer.from(data.content, 'base64').toString('utf-8')

  return {
    path: data.path,
    content: decoded,
    encoding: data.encoding,
  }
}
