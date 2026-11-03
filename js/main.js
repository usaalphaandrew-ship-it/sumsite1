// AITutor Interactive Space Deck, Claude Cartoon & Minecraft Engine
document.addEventListener('DOMContentLoaded', () => {

  // ─── 1. Spaceship Cosmic Starfield Canvas ───
  const canvas = document.getElementById('starfield-canvas');
  if (canvas) {
    const ctx = canvas.getContext('2d');
    let width = canvas.width = window.innerWidth;
    let height = canvas.height = window.innerHeight;

    const stars = [];
    const STAR_COUNT = 90;

    for (let i = 0; i < STAR_COUNT; i++) {
      stars.push({
        x: Math.random() * width,
        y: Math.random() * height,
        radius: Math.random() * 1.6 + 0.4,
        alpha: Math.random() * 0.8 + 0.2,
        speed: Math.random() * 0.3 + 0.05,
        twinkleSpeed: Math.random() * 0.02 + 0.005
      });
    }

    function renderStars() {
      ctx.clearRect(0, 0, width, height);
      for (const s of stars) {
        s.alpha += Math.sin(Date.now() * s.twinkleSpeed) * 0.015;
        if (s.alpha > 0.95) s.alpha = 0.95;
        if (s.alpha < 0.15) s.alpha = 0.15;

        s.y -= s.speed;
        if (s.y < 0) s.y = height;

        ctx.fillStyle = `rgba(255, 255, 255, ${s.alpha})`;
        ctx.beginPath();
        ctx.arc(s.x, s.y, s.radius, 0, Math.PI * 2);
        ctx.fill();

        // Occasional cyan/violet glow on larger stars
        if (s.radius > 1.4) {
          ctx.fillStyle = `rgba(56, 189, 248, ${s.alpha * 0.35})`;
          ctx.beginPath();
          ctx.arc(s.x, s.y, s.radius * 2.5, 0, Math.PI * 2);
          ctx.fill();
        }
      }
      requestAnimationFrame(renderStars);
    }
    renderStars();

    window.addEventListener('resize', () => {
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
    });
  }

  // ─── 2. Interactive Claude Cartoon Dialogue Engine ───
  const claudeResponses = {
    agent: {
      text: "Beep-boop human friend! 🤖 Building an autonomous AI agent is like giving an LLM hands and feet. In AITutor 1-on-1 sessions, we hook an LLM up with real tools (web search, calculator, Python REPL) using a ReAct thought loop. Here's your starter blueprint:",
      code: `from langchain.agents import initialize_agent, load_tools
from langchain.chat_models import ChatAnthropic

llm = ChatAnthropic(model="claude-3-5-sonnet")
tools = load_tools(["serpapi", "python_repl"], llm=llm)
agent = initialize_agent(tools, llm, agent="zero-shot-react-description")

# The agent autonomously reasons, calls tools, and solves missions!
agent.run("Calculate Minecraft redstone repeater tick delay for 60Hz")`
    },
    minecraft: {
      text: "Yooo! ⛏️ Diamond pickaxe energy! In our Minecraft Java modding track, we use Fabric & Forge. You'll build custom magical blocks that run actual AI code when clicked in-game! Check out this custom AI Voxel Block:",
      code: `public class AiTutorBlock extends Block {
    public AiTutorBlock(Settings settings) { super(settings); }

    @Override
    public ActionResult onUse(BlockState state, World world, BlockPos pos, PlayerEntity player) {
        if (!world.isClient) {
            player.sendMessage(Text.of("§a[AITutor] §fXP Level boosted! Spawning companion bot!"), false);
            // Connects to local AI agent over WebSocket!
        }
        return ActionResult.SUCCESS;
    }
}`
    },
    tokens: {
      text: "🧠 Great question! LLMs don't read words—they tokenize text into byte-pair numbers (~4 characters per token). If your prompt has runaway context, latency and costs explode. In AITutor, we teach you prompt caching, KV caching, and dynamic token budgeting:",
      code: `// Dynamic Token Budgeter & Prompt Compressor
function createOptimalPrompt(userQuery, memoryLogs) {
  const MAX_TOKEN_BUDGET = 2048;
  const prunedMemory = memoryLogs.slice(-5); // Keep high-relevance tokens
  return {
    system: "You are AITutor Companion. Answer with code & humor.",
    messages: [{ role: "user", content: userQuery }],
    max_tokens: MAX_TOKEN_BUDGET
  };
}`
    },
    redstone: {
      text: "🔴 Redstone is literally discrete electrical engineering! A Redstone torch is an inverter (NOT gate). Put two together with wire, and you have an AND gate. In AITutor, we bridge Minecraft Redstone into computer architecture and Turing machines!",
      code: `-- Minecraft Redstone Logic Simulator
-- Signal Strength: 0 (LOW) to 15 (HIGH)
local function redstone_and_gate(inputA, inputB)
    local torchA = inputA == 0 and 15 or 0
    local torchB = inputB == 0 and 15 or 0
    local wire = math.max(torchA, torchB)
    return wire == 0 and 15 or 0 -- Inverted output (AND logic)
end`
    }
  };

  const claudeBubble = document.getElementById('claude-speech-text');
  const claudeCodeBlock = document.getElementById('claude-speech-code');
  const promptChips = document.querySelectorAll('.prompt-chip-btn');

  promptChips.forEach(chip => {
    chip.addEventListener('click', () => {
      promptChips.forEach(c => c.classList.remove('active'));
      chip.classList.add('active');

      const topic = chip.getAttribute('data-topic');
      const data = claudeResponses[topic];
      if (data && claudeBubble) {
        // Typing animation effect
        claudeBubble.style.opacity = '0';
        setTimeout(() => {
          claudeBubble.textContent = data.text;
          claudeBubble.style.opacity = '1';
          if (claudeCodeBlock) {
            claudeCodeBlock.textContent = data.code;
            claudeCodeBlock.style.display = 'block';
          }
        }, 150);
      }
    });
  });

  // ─── 3. Interactive Code Playground & Simulator ───
  const playgroundSnippets = {
    python: {
      lang: "python",
      code: `# AITutor Session: Autonomous Neural Agent
import math

class AITutorBrain:
    def __init__(self, student_name):
        self.student = student_name
        self.xp_level = 99
        self.streak_days = 14
        
    def evaluate_code(self, concept):
        print(f"🚀 Mission launched for {self.student}!")
        print(f"⚡ Concept: {concept} -> Compilation: 100% SUCCESS")
        return {"grade": "A+", "xp_gained": 350}

tutor = AITutorBrain("Future AI Astronaut")
result = tutor.evaluate_code("Transformer Multi-Head Attention")
print(f"🏆 Result: {result}")`,
      output: `[SPACESHIP-KERNEL 3.2] Initializing Python 3.11 Runtime...
>> 🚀 Mission launched for Future AI Astronaut!
>> ⚡ Concept: Transformer Multi-Head Attention -> Compilation: 100% SUCCESS
>> 🏆 Result: {'grade': 'A+', 'xp_gained': 350}
>> [AITUTOR] Mastered! Diamond Achievement unlocked. +350 XP added to belt.`
    },
    minecraft: {
      lang: "java",
      code: `// AITutor Minecraft Java Mod: Custom Redstone Thruster
package com.aitutor.hyperspace;

public class VoxelThrusterItem extends Item {
    public VoxelThrusterItem(Properties props) {
        super(props);
    }
    
    public void activateBoost(Player player) {
        player.setDeltaMovement(0, 1.8, 0); // Launch player to cloud level!
        player.displayClientMessage(
            Component.literal("§b[AITutor] §eHyperspace Jump Initiated!"), true
        );
    }
}`,
      output: `[GRADLE BUILD 8.4] Compiling Fabric Mod 'aitutor-hyperspace'...
>> [INFO] Bytecode verification passed.
>> [INFO] Registered VoxelThrusterItem to item registry 'aitutor:thruster'.
>> [TEST SERVER] Player 'MinecraftSteve' activated Hyperspace Thruster!
>> [AITUTOR] Delta velocity updated. Player airborne at Y=180!`
    },
    claude: {
      lang: "javascript",
      code: `// AITutor Interactive Claude Tool Calling
import Anthropic from '@anthropic-ai/sdk';

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_KEY });

const message = await anthropic.messages.create({
  model: 'claude-3-5-sonnet-20241022',
  max_tokens: 1024,
  system: 'You are an enthusiastic cartoon coding tutor with astronaut humor.',
  messages: [{
    role: 'user',
    content: 'Explain binary search trees using Minecraft chests!'
  }]
});

console.log(message.content[0].text);`,
      output: `[CLAUDE 3.5 SONNET STREAM] Connecting to Anthropic API...
>> Claude: "Imagine your storage room in Minecraft! If you alphabetize your chests,
>> you don't check all 100 chests one-by-one. You walk straight to the middle chest ('M').
>> If you want 'Diamonds' ('D'), you know it's on the left branch! That's O(log N)!"
>> [AITUTOR] Prompt cost: 42 tokens in, 98 tokens out. Cache hit: YES!`
    },
    redstone: {
      lang: "c",
      code: `// AITutor Embedded Redstone: 4-bit ALU Emulator
#include <stdio.h>

int alu_add(int a, int b) {
    while (b != 0) {
        int carry = a & b;  // Redstone AND Gate
        a = a ^ b;          // Redstone XOR Gate
        b = carry << 1;     // Wire shift
    }
    return a;
}

int main() {
    int result = alu_add(7, 5); // 0111 + 0101 = 1100 (12)
    printf("Redstone ALU Calculated: %d\\n", result);
    return 0;
}`,
      output: `[GCC 13.2] Compiling redstone_alu.c with -O3 optimization...
>> Executing ELF binary...
>> Redstone ALU Calculated: 12
>> [VERIFIED] Binary arithmetic matches physical Redstone comparator circuit!`
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
      .replace(/\b(class|def|import|from|return|function|const|let|var|public|package|super|new|while|int|void|if|else)\b/g, '<span class="code-kw">$1</span>')
      .replace(/\b(print|console\.log|printf|initialize_agent|load_tools|setDeltaMovement|Component\.literal)\b/g, '<span class="code-fn">$1</span>')
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
      runBtn.textContent = '⚡ Simulating...';

      setTimeout(() => {
        const data = playgroundSnippets[activeSnippetKey];
        if (consoleOutput && data) {
          consoleOutput.textContent = data.output;
          consoleOutput.classList.add('show');
        }
        runBtn.disabled = false;
        runBtn.textContent = '▶ Run in Simulator';
      }, 400);
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

  // ─── 4. Minecraft Toolbar Slot Selection ───
  const mcSlots = document.querySelectorAll('.mc-slot');
  mcSlots.forEach(slot => {
    slot.addEventListener('click', () => {
      mcSlots.forEach(s => s.classList.remove('selected'));
      slot.classList.add('selected');
      const skillName = slot.getAttribute('data-skill');
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
      const contactSection = document.getElementById('contact');
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
