// AITutor — Professional Engineering Mentorship & Interactive Code Lab
document.addEventListener('DOMContentLoaded', () => {

  // ─── 1. Subtle Ambient Particle Canvas ───
  const canvas = document.getElementById('starfield-canvas');
  if (canvas) {
    const ctx = canvas.getContext('2d');
    let width = canvas.width = window.innerWidth;
    let height = canvas.height = window.innerHeight;

    const particles = [];
    const PARTICLE_COUNT = 70;

    for (let i = 0; i < PARTICLE_COUNT; i++) {
      particles.push({
        x: Math.random() * width,
        y: Math.random() * height,
        radius: Math.random() * 1.5 + 0.5,
        alpha: Math.random() * 0.6 + 0.2,
        speed: Math.random() * 0.2 + 0.05,
        twinkleSpeed: Math.random() * 0.02 + 0.005
      });
    }

    function renderParticles() {
      ctx.clearRect(0, 0, width, height);
      for (const p of particles) {
        p.alpha += Math.sin(Date.now() * p.twinkleSpeed) * 0.01;
        if (p.alpha > 0.8) p.alpha = 0.8;
        if (p.alpha < 0.15) p.alpha = 0.15;

        p.y -= p.speed;
        if (p.y < 0) p.y = height;

        ctx.fillStyle = `rgba(148, 163, 184, ${p.alpha})`;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
        ctx.fill();

        if (p.radius > 1.3) {
          ctx.fillStyle = `rgba(56, 189, 248, ${p.alpha * 0.3})`;
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.radius * 2.2, 0, Math.PI * 2);
          ctx.fill();
        }
      }
      requestAnimationFrame(renderParticles);
    }
    renderParticles();

    window.addEventListener('resize', () => {
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
    });
  }

  // ─── 2. Interactive Senior Mentor Code Review Switcher (Hero Console) ───
  const mentorReviews = {
    rag: {
      topic: "Retrieval-Augmented Generation (RAG)",
      feedback: "“Your vector search was pulling raw top-k chunks without re-ranking, resulting in context dilution. In this refactor, we inject a cross-encoder re-ranker and reciprocal rank fusion to prune hallucinations by 64%.”",
      code: `async function retrieveContext(query: string, k = 5): Promise<string[]> {
  const denseEmbeddings = await openai.embeddings.create({ input: query });
  const rawMatches = await vectorIndex.query({ vector: denseEmbeddings.data[0].embedding, topK: k * 3 });
  
  // Mentor Optimization: Cross-Encoder Re-Ranking Pipeline
  const reranked = await cohere.rerank({ query, documents: rawMatches.docs, topN: k });
  return reranked.results.map(r => r.document.text);
}`
    },
    api: {
      topic: "High-Throughput Next.js API Architecture",
      feedback: "“Running heavy database aggregation synchronously inside the edge route caused request timeouts at scale. We decoupled this with an async Redis task queue and streaming server response.”",
      code: `export async function POST(req: NextRequest) {
  const body = await req.json();
  const jobId = await taskQueue.enqueue("process-analytics", body);
  
  // Immediate 202 Accepted with polling URL or SSE stream
  return NextResponse.json({ status: "queued", jobId, streamUrl: \`/api/stream/\${jobId}\` }, { status: 202 });
}`
    },
    concurrency: {
      topic: "Go Concurrent Worker Pool",
      feedback: "“Spawning unbounded goroutines per incoming HTTP request overwhelmed connection pools. In this 1-on-1 session, we implemented a buffered worker pool pattern with graceful shutdown and backpressure.”",
      code: `func StartWorkerPool(numWorkers int, jobs <-chan Job) {
    var wg sync.WaitGroup
    for w := 1; w <= numWorkers; w++ {
        wg.Add(1)
        go func(workerId int) {
            defer wg.Done()
            for j := range jobs {
                j.Execute(workerId)
            }
        }(w)
    }
    wg.Wait()
}`
    },
    caching: {
      topic: "Distributed Cache & Stale-While-Revalidate",
      feedback: "“Cache stampedes occurred during peak traffic spikes. We introduced a single-flight mutex lock combined with stale-while-revalidate TTLs, dropping database reads from 12,000/s to 40/s.”",
      code: `async function getCachedUserProfile(userId: string) {
  const cached = await redis.get(\`user:\${userId}\`);
  if (cached) return JSON.parse(cached);

  // Single-flight lock prevents stampede
  return singleFlight.do(userId, async () => {
    const dbUser = await db.users.findUnique({ where: { id: userId } });
    await redis.set(\`user:\${userId}\`, JSON.stringify(dbUser), 'EX', 3600);
    return dbUser;
  });
}`
    }
  };

  const topicBtns = document.querySelectorAll('.topic-btn');
  const mentorFeedbackText = document.getElementById('mentor-feedback-text');
  const mentorCodeBlock = document.getElementById('mentor-code-block');

  topicBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      topicBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');

      const key = btn.getAttribute('data-topic');
      const data = mentorReviews[key];
      if (data && mentorFeedbackText && mentorCodeBlock) {
        mentorFeedbackText.style.opacity = '0';
        setTimeout(() => {
          mentorFeedbackText.textContent = data.feedback;
          mentorFeedbackText.style.opacity = '1';
          mentorCodeBlock.textContent = data.code;
        }, 120);
      }
    });
  });

  // ─── 3. Interactive Code Playground & Simulator ───
  const playgroundSnippets = {
    python: {
      lang: "python",
      code: `# AITutor Session: Production Vector Search & RAG
import numpy as np

class VectorRetriever:
    def __init__(self, dimension: int = 1536):
        self.dimension = dimension
        self.vectors = []
        
    def add_document(self, doc_id: str, embedding: list[float]):
        self.vectors.append((doc_id, np.array(embedding, dtype=np.float32)))
        
    def search_similarity(self, query_emb: list[float], top_k: int = 3):
        q = np.array(query_emb, dtype=np.float32)
        q_norm = np.linalg.norm(q)
        scores = []
        for doc_id, vec in self.vectors:
            cosine_sim = np.dot(q, vec) / (q_norm * np.linalg.norm(vec) + 1e-9)
            scores.append((doc_id, float(cosine_sim)))
        scores.sort(key=lambda x: x[1], reverse=True)
        return scores[:top_k]

# Live Test Execution
retriever = VectorRetriever()
retriever.add_document("doc_arch_01", [0.42, 0.18, 0.88, 0.12])
retriever.add_document("doc_arch_02", [0.11, 0.94, 0.31, 0.05])
matches = retriever.search_similarity([0.41, 0.20, 0.85, 0.10], top_k=2)
print("Vector Index Query Results:", matches)`,
      output: `[PYTHON 3.12 ENGINE] Initializing Vector Embeddings Runtime...
>> Processing Cosine Similarity across dense tensor indices...
>> Top Match: doc_arch_01 (Cosine Similarity: 0.9984)
>> Second Match: doc_arch_02 (Cosine Similarity: 0.4120)
>> Latency: 2.1ms | Memory Overhead: 4.8MB
>> [AITUTOR] Verification PASSED. Architecture ready for production scaling.`
    },
    typescript: {
      lang: "typescript",
      code: `// AITutor Session: High-Performance Next.js Server Action
import { z } from "zod";

const SessionSchema = z.object({
  studentId: z.string().uuid(),
  track: z.enum(["ai_systems", "full_stack", "distributed_systems"]),
  targetHours: z.number().min(1).max(20),
});

export async function scheduleMentorshipSession(formData: unknown) {
  const parsed = SessionSchema.safeParse(formData);
  if (!parsed.success) {
    return { success: false, errors: parsed.error.flatten() };
  }
  
  const { studentId, track, targetHours } = parsed.data;
  const match = await assignSeniorTechLead({ track, experienceLevel: "Senior" });
  
  return {
    success: true,
    sessionId: \`session_\${Date.now()}\`,
    assignedMentor: match.mentorName,
    scheduledSlot: match.nextAvailableTime
  };
}`,
      output: `[TSC 5.4 ENGINE] Compiling Next.js Server Architecture...
>> Validating Zod input schemas...
>> Routing to Senior Tech Lead Matching Algorithm...
>> Match Confirmed: 'Elena Rostova' (Principal Systems Architect)
>> Next Available Slot: Tomorrow, 10:00 AM EST
>> [AITUTOR] Session Dispatch: 200 OK (0 Type Errors)`
    },
    go: {
      lang: "go",
      code: `// AITutor Session: Distributed Microservice Worker Pool
package main

import (
    "fmt"
    "sync"
    "time"
)

type WorkUnit struct {
    ID     int
    Task   string
}

func ProcessJob(w int, job WorkUnit) {
    fmt.Printf("[Worker %d] Processing Task: %s (ID: %d)\\n", w, job.Task, job.ID)
    time.Sleep(10 * time.Millisecond)
}

func main() {
    jobs := make(chan WorkUnit, 100)
    var wg sync.WaitGroup

    for w := 1; w <= 3; w++ {
        wg.Add(1)
        go func(workerId int) {
            defer wg.Done()
            for j := range jobs {
                ProcessJob(workerId, j)
            }
        }(w)
    }

    for j := 1; j <= 3; j++ {
        jobs <- WorkUnit{ID: j, Task: fmt.Sprintf("ClusterTask-%d", j)}
    }
    close(jobs)
    wg.Wait()
    fmt.Println("[Engine] All distributed tasks successfully processed.")
}`,
      output: `[GO 1.22 COMPILER] Building concurrent binary with race detector...
>> [Worker 1] Processing Task: ClusterTask-1 (ID: 1)
>> [Worker 2] Processing Task: ClusterTask-2 (ID: 2)
>> [Worker 3] Processing Task: ClusterTask-3 (ID: 3)
>> [Engine] All distributed tasks successfully processed.
>> Benchmark: 0 Data Races Detected | Goroutines exited cleanly.`
    },
    rust: {
      lang: "rust",
      code: `// AITutor Session: Zero-Copy Tokenizer & Memory Safety
pub struct Tokenizer<'a> {
    text: &'a str,
    cursor: usize,
}

impl<'a> Tokenizer<'a> {
    pub fn new(input: &'a str) -> Self {
        Tokenizer { text: input, cursor: 0 }
    }
}

impl<'a> Iterator for Tokenizer<'a> {
    type Item = &'a str;

    fn next(&mut self) -> Option<Self::Item> {
        if self.cursor >= self.text.len() {
            return None;
        }
        let remaining = &self.text[self.cursor..];
        let bytes = remaining.as_bytes();
        let end = bytes.iter().position(|&b| b == b' ').unwrap_or(remaining.len());
        let token = &remaining[..end];
        self.cursor += end + 1;
        Some(token)
    }
}

fn main() {
    let raw = "ZeroCopy Tokenization with Safe Rust Lifetimes";
    let tokenizer = Tokenizer::new(raw);
    for token in tokenizer {
        println!("Token: {}", token);
    }
}`,
      output: `[RUSTC 1.77 ENGINE] Compiling with --release optimizations...
>> Token: ZeroCopy
>> Token: Tokenization
>> Token: with
>> Token: Safe
>> Token: Rust
>> Token: Lifetimes
>> Heap Allocations: 0 bytes (Zero-copy slice reference verified).`
    }
  };

  const codeTabs = document.querySelectorAll('.code-tab-btn');
  const codeDisplay = document.getElementById('code-display-content');
  const runBtn = document.getElementById('run-code-btn');
  const copyBtn = document.getElementById('copy-code-btn');
  const consoleOutput = document.getElementById('terminal-console-output');

  let activeSnippetKey = 'python';

  function renderSnippet(key) {
    activeSnippetKey = key;
    const data = playgroundSnippets[key];
    if (data && codeDisplay) {
      codeDisplay.innerHTML = escapeAndColorize(data.code);
    }
    if (consoleOutput) {
      consoleOutput.classList.remove('show');
    }
  }

  function escapeAndColorize(raw) {
    return raw
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/(#.*|\/\/.*|--.*)/g, '<span class="code-comment">$1</span>')
      .replace(/(".*?"|'.*?'|`.*?`)/g, '<span class="code-str">$1</span>')
      .replace(/\b(class|def|import|from|return|function|const|let|var|public|package|super|new|while|int|void|if|else|struct|impl|pub|type|async|await|package|func|range|for)\b/g, '<span class="code-kw">$1</span>')
      .replace(/\b(print|println|printf|console\.log|search_similarity|StartWorkerPool|scheduleMentorshipSession|safeParse)\b/g, '<span class="code-fn">$1</span>')
      .replace(/\b([0-9]+)\b/g, '<span class="code-num">$1</span>');
  }

  codeTabs.forEach(tab => {
    tab.addEventListener('click', () => {
      codeTabs.forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      const key = tab.getAttribute('data-code');
      renderSnippet(key);
    });
  });

  if (runBtn) {
    runBtn.addEventListener('click', () => {
      runBtn.disabled = true;
      runBtn.textContent = '⚡ Running...';

      setTimeout(() => {
        const data = playgroundSnippets[activeSnippetKey];
        if (consoleOutput && data) {
          consoleOutput.textContent = data.output;
          consoleOutput.classList.add('show');
        }
        runBtn.disabled = false;
        runBtn.textContent = '▶ Run in Simulator';
      }, 350);
    });
  }

  if (copyBtn) {
    copyBtn.addEventListener('click', () => {
      const data = playgroundSnippets[activeSnippetKey];
      if (data) {
        navigator.clipboard.writeText(data.code).then(() => {
          const orig = copyBtn.textContent;
          copyBtn.textContent = '✓ Copied!';
          setTimeout(() => { copyBtn.textContent = orig; }, 1800);
        });
      }
    });
  }

  // Initial code snippet render
  renderSnippet('python');

  // ─── 4. Specialization Track Selection ───
  const specPills = document.querySelectorAll('.spec-pill');
  specPills.forEach(pill => {
    pill.addEventListener('click', () => {
      specPills.forEach(p => p.classList.remove('active'));
      pill.classList.add('active');
      const skillName = pill.getAttribute('data-skill');
      const targetInput = document.getElementById('tutoring-skill-input');
      if (targetInput && skillName) {
        targetInput.value = skillName;
      }
    });
  });

  // ─── 5. Package Selector Navigation ───
  const packageBtns = document.querySelectorAll('[data-package]');
  packageBtns.forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      const pkg = btn.getAttribute('data-package');
      const contactSection = document.getElementById('booking');
      if (contactSection) {
        contactSection.scrollIntoView({ behavior: 'smooth' });
        const pkgInput = document.getElementById('selected-package');
        if (pkgInput) {
          pkgInput.value = pkg;
        }
      }
    });
  });

  // ─── 6. FAQ Accordion ───
  const faqRows = document.querySelectorAll('.faq-row');
  faqRows.forEach(row => {
    row.addEventListener('click', () => {
      const isCurrentOpen = row.classList.contains('open');
      faqRows.forEach(r => r.classList.remove('open'));
      if (!isCurrentOpen) {
        row.classList.add('open');
      }
    });
  });

});
