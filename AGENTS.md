# The Dynamic Expert Network - OpenClaw Agents

This system features a **scalable, dynamic team** of autonomous agents. Unlike static configurations, you can now "Hire" any number of specialists for any role imaginable.

## 🚀 Unlimited Specialization
The system is no longer limited to the 3 default experts. You can add:
- **🎨 expert:artist**: UI/UX design and asset generation.
- **🛡️ expert:security**: Penetration testing and code hardening.
- **📈 expert:analyst**: Financial modeling and data visualization.
- **Any role you define in a folder!**

## 🛠️ How to Hire New Agents
There are two ways to expand your team:

### 1. The Easy Way (Automated)
Run the hire script in PowerShell:
```powershell
.\scripts\hire-agent.ps1 -AgentId "artist" -Role "UI/UX Designer" -Tasks "Design stunning interfaces and generate SVG assets."
```

### 2. The Manual Way (Auto-Discovery)
Simply create a folder in `.openclaw/workspace/` with its own identity:
1. Create folder `.openclaw/workspace/manager`
2. Create `SOUL.md` inside it defining their personality and missions.
3. The system will **Auto-Discover** the agent on the next session or UI refresh.

## 🏗️ Technical Isolation & Governance
- **Autonomous Workspaces**: Every agent owns their folder. They operate independently to ensure clean, focused memories.
- **Customized SOUL**: Each specialist's behavior is dictated by their unique `SOUL.md`. 
- **Dynamic Routing**: Use the `agentId` in your sessions to target any specialist in your network.

## 🤝 Coordination
The Assistant (`ClawdBot`) acts as your primary gateway. Use it to delegate tasks to your growing team of specialists.
