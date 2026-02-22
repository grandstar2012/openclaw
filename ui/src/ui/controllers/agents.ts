import { loadAgentIdentity } from "./agent-identity.ts";
import type { GatewayBrowserClient } from "../gateway.ts";
import type { AgentsListResult } from "../types.ts";

export type AgentsState = {
  client: GatewayBrowserClient | null;
  connected: boolean;
  agentsLoading: boolean;
  agentsError: string | null;
  agentsList: AgentsListResult | null;
  agentsSelectedId: string | null;
  agentIdentityLoading: boolean;
  agentIdentityById: Record<string, any>;
};

export async function loadAgents(state: AgentsState) {
  if (!state.client || !state.connected) {
    return;
  }
  if (state.agentsLoading) {
    return;
  }
  state.agentsLoading = true;
  state.agentsError = null;
  try {
    const res = await state.client.request<AgentsListResult>("agents.list", {});
    if (res) {
      state.agentsList = res;
      const selected = state.agentsSelectedId;
      const known = res.agents.some((entry) => entry.id === selected);
      if (!selected || !known) {
        state.agentsSelectedId = res.defaultId ?? res.agents[0]?.id ?? null;
      }
    }
  } catch (err) {
    state.agentsError = String(err);
  } finally {
    state.agentsLoading = false;
  }
}

export async function hireAgent(state: AgentsState, name: string) {
  if (!state.client || !state.connected) {
    return;
  }
  const id = name.toLowerCase().replace(/\s+/g, "-");
  const workspace = `.openclaw/workspace/${id}`;
  try {
    await state.client.request("agents.create", {
      name,
      workspace,
    });
    void loadAgents(state);
  } catch (err) {
    console.error("Failed to hire agent:", err);
    throw err;
  }
}

export async function fireAgent(state: AgentsState, agentId: string) {
  if (!state.client || !state.connected) {
    return;
  }
  try {
    await state.client.request("agents.delete", {
      agentId,
      deleteFiles: true,
    });
    state.agentsSelectedId = null;
    void loadAgents(state);
  } catch (err) {
    console.error("Failed to fire agent:", err);
    throw err;
  }
}

export async function updateAgentIdentity(
  state: AgentsState & { agentIdentityLoading: boolean; agentIdentityById: Record<string, any> },
  agentId: string,
  patch: { name?: string; emoji?: string; avatar?: string },
) {
  if (!state.client || !state.connected) {
    return;
  }
  try {
    await state.client.request("agents.update", {
      agentId,
      ...patch,
    });
    void loadAgents(state);
    void loadAgentIdentity(state as any, agentId, true);
  } catch (err) {
    console.error("Failed to update agent identity:", err);
    throw err;
  }
}
