import { html, nothing } from "lit";
import type {
  AgentIdentityResult,
  AgentsFilesListResult,
  AgentsListResult,
  ChannelsStatusSnapshot,
  CronJob,
  CronStatus,
  SkillStatusReport,
} from "../types.ts";
import {
  renderAgentFiles,
  renderAgentChannels,
  renderAgentCron,
} from "./agents-panels-status-files.ts";
import { renderAgentTools, renderAgentSkills } from "./agents-panels-tools-skills.ts";
import { icons } from "../icons.ts";
import {
  agentBadgeText,
  buildAgentContext,
  buildModelOptions,
  normalizeAgentLabel,
  normalizeModelValue,
  parseFallbackList,
  resolveAgentConfig,
  resolveAgentEmoji,
  resolveModelFallbacks,
  resolveModelLabel,
  resolveModelPrimary,
} from "./agents-utils.ts";

export type AgentsPanel = "overview" | "files" | "tools" | "skills" | "channels" | "cron";

export type AgentsProps = {
  loading: boolean;
  error: string | null;
  agentsList: AgentsListResult | null;
  selectedAgentId: string | null;
  activePanel: AgentsPanel;
  configForm: Record<string, unknown> | null;
  configLoading: boolean;
  configSaving: boolean;
  configDirty: boolean;
  channelsLoading: boolean;
  channelsError: string | null;
  channelsSnapshot: ChannelsStatusSnapshot | null;
  channelsLastSuccess: number | null;
  cronLoading: boolean;
  cronStatus: CronStatus | null;
  cronJobs: CronJob[];
  cronError: string | null;
  agentFilesLoading: boolean;
  agentFilesError: string | null;
  agentFilesList: AgentsFilesListResult | null;
  agentFileActive: string | null;
  agentFileContents: Record<string, string>;
  agentFileDrafts: Record<string, string>;
  agentFileSaving: boolean;
  agentIdentityLoading: boolean;
  agentIdentityError: string | null;
  agentIdentityById: Record<string, AgentIdentityResult>;
  agentSkillsLoading: boolean;
  agentSkillsReport: SkillStatusReport | null;
  agentSkillsError: string | null;
  agentSkillsAgentId: string | null;
  skillsFilter: string;
  onRefresh: () => void;
  onSelectAgent: (agentId: string) => void;
  onSelectPanel: (panel: AgentsPanel) => void;
  onLoadFiles: (agentId: string) => void;
  onSelectFile: (name: string) => void;
  onFileDraftChange: (name: string, content: string) => void;
  onFileReset: (name: string) => void;
  onFileSave: (name: string) => void;
  onToolsProfileChange: (agentId: string, profile: string | null, clearAllow: boolean) => void;
  onToolsOverridesChange: (agentId: string, alsoAllow: string[], deny: string[]) => void;
  onConfigReload: () => void;
  onConfigSave: () => void;
  onModelChange: (agentId: string, modelId: string | null) => void;
  onModelFallbacksChange: (agentId: string, fallbacks: string[]) => void;
  onChannelsRefresh: () => void;
  onCronRefresh: () => void;
  onSkillsFilterChange: (next: string) => void;
  onSkillsRefresh: () => void;
  onAgentSkillToggle: (agentId: string, skillName: string, enabled: boolean) => void;
  onAgentSkillsClear: (agentId: string) => void;
  onAgentSkillsDisableAll: (agentId: string) => void;
  onHire: (name: string) => void;
  onFire: (agentId: string) => void;
  onIdentityUpdate: (agentId: string, patch: { name?: string; emoji?: string; avatar?: string }) => void;
};

export type AgentContext = {
  workspace: string;
  model: string;
  identityName: string;
  identityEmoji: string;
  skillsLabel: string;
  isDefault: boolean;
};

export function renderAgents(props: AgentsProps) {
  const agents = props.agentsList?.agents ?? [];
  const defaultId = props.agentsList?.defaultId ?? null;
  const selectedId = props.selectedAgentId ?? defaultId ?? agents[0]?.id ?? null;
  const selectedAgent = selectedId
    ? (agents.find((agent) => agent.id === selectedId) ?? null)
    : null;

  return html`
    <div class="agents-layout">
      <section class="card agents-sidebar">
        <div class="row" style="justify-content: space-between;">
          <div>
            <div class="card-title">Agents</div>
            <div class="card-sub">${agents.length} configured.</div>
          </div>
          <button class="btn btn--sm" ?disabled=${props.loading} @click=${props.onRefresh}>
            ${props.loading ? "Loading…" : "Refresh"}
          </button>
        </div>
        ${
          props.error
            ? html`<div class="callout danger" style="margin-top: 12px;">${props.error}</div>`
            : nothing
        }
        <div class="agent-list" style="margin-top: 12px;">
          ${
            agents.length === 0
              ? html`
                  <div class="muted">No agents found.</div>
                `
              : agents.map((agent) => {
                  const badge = agentBadgeText(agent.id, defaultId);
                  const emoji = resolveAgentEmoji(agent, props.agentIdentityById[agent.id] ?? null);
                  return html`
                    <button
                      type="button"
                      class="agent-row ${selectedId === agent.id ? "active" : ""}"
                      @click=${() => props.onSelectAgent(agent.id)}
                    >
                      <div class="agent-avatar">${emoji || normalizeAgentLabel(agent).slice(0, 1)}</div>
                      <div class="agent-info">
                        <div class="agent-title">${normalizeAgentLabel(agent)}</div>
                        <div class="agent-sub mono">${agent.id}</div>
                      </div>
                      ${badge ? html`<span class="agent-pill">${badge}</span>` : nothing}
                    </button>
                  `;
                })
          }
        </div>
        <div class="row" style="justify-content: space-between; margin-top: 16px; padding: 0 4px;">
          <button class="btn btn--sm primary" style="flex: 1; margin-right: 4px;" @click=${() => {
            const name = prompt("Hire New Specialist (e.g., Artist, Writer, Manager):");
            if (name && name.trim()) {
              props.onHire(name.trim());
            }
          }}>
            + Hire Agent
          </button>
          <button class="btn btn--sm" ?disabled=${!selectedId || selectedId === defaultId} @click=${() => {
            if (selectedId && confirm(`Are you sure you want to fire ${selectedId}? This will delete their workspace and sessions.`)) {
              props.onFire(selectedId);
            }
          }}>
            − Fire
          </button>
        </div>
      </section>
      <section class="agents-main">
        ${
          !selectedAgent
            ? html`
                <div class="card">
                  <div class="card-title">Select an agent</div>
                  <div class="card-sub">Pick an agent to inspect its workspace and tools.</div>
                </div>
              `
            : html`
                ${renderAgentHeader(
                  selectedAgent,
                  defaultId,
                  props.agentIdentityById[selectedAgent.id] ?? null,
                  props.onIdentityUpdate,
                )}
                ${renderAgentTabs(props.activePanel, (panel) => props.onSelectPanel(panel))}
                ${
                  props.activePanel === "overview"
                    ? renderAgentOverview({
                        agent: selectedAgent,
                        defaultId,
                        configForm: props.configForm,
                        agentFilesList: props.agentFilesList,
                        agentIdentity: props.agentIdentityById[selectedAgent.id] ?? null,
                        agentIdentityError: props.agentIdentityError,
                        agentIdentityLoading: props.agentIdentityLoading,
                        configLoading: props.configLoading,
                        configSaving: props.configSaving,
                        configDirty: props.configDirty,
                        onConfigReload: props.onConfigReload,
                        onConfigSave: props.onConfigSave,
                        onModelChange: props.onModelChange,
                        onModelFallbacksChange: props.onModelFallbacksChange,
                        onIdentityUpdate: props.onIdentityUpdate,
                      })
                    : nothing
                }
                ${
                  props.activePanel === "files"
                    ? renderAgentFiles({
                        agentId: selectedAgent.id,
                        agentFilesList: props.agentFilesList,
                        agentFilesLoading: props.agentFilesLoading,
                        agentFilesError: props.agentFilesError,
                        agentFileActive: props.agentFileActive,
                        agentFileContents: props.agentFileContents,
                        agentFileDrafts: props.agentFileDrafts,
                        agentFileSaving: props.agentFileSaving,
                        onLoadFiles: props.onLoadFiles,
                        onSelectFile: props.onSelectFile,
                        onFileDraftChange: props.onFileDraftChange,
                        onFileReset: props.onFileReset,
                        onFileSave: props.onFileSave,
                      })
                    : nothing
                }
                ${
                  props.activePanel === "tools"
                    ? renderAgentTools({
                        agentId: selectedAgent.id,
                        configForm: props.configForm,
                        configLoading: props.configLoading,
                        configSaving: props.configSaving,
                        configDirty: props.configDirty,
                        onProfileChange: props.onToolsProfileChange,
                        onOverridesChange: props.onToolsOverridesChange,
                        onConfigReload: props.onConfigReload,
                        onConfigSave: props.onConfigSave,
                      })
                    : nothing
                }
                ${
                  props.activePanel === "skills"
                    ? renderAgentSkills({
                        agentId: selectedAgent.id,
                        report: props.agentSkillsReport,
                        loading: props.agentSkillsLoading,
                        error: props.agentSkillsError,
                        activeAgentId: props.agentSkillsAgentId,
                        configForm: props.configForm,
                        configLoading: props.configLoading,
                        configSaving: props.configSaving,
                        configDirty: props.configDirty,
                        filter: props.skillsFilter,
                        onFilterChange: props.onSkillsFilterChange,
                        onRefresh: props.onSkillsRefresh,
                        onToggle: props.onAgentSkillToggle,
                        onClear: props.onAgentSkillsClear,
                        onDisableAll: props.onAgentSkillsDisableAll,
                        onConfigReload: props.onConfigReload,
                        onConfigSave: props.onConfigSave,
                      })
                    : nothing
                }
                ${
                  props.activePanel === "channels"
                    ? renderAgentChannels({
                        context: buildAgentContext(
                          selectedAgent,
                          props.configForm,
                          props.agentFilesList,
                          defaultId,
                          props.agentIdentityById[selectedAgent.id] ?? null,
                        ),
                        configForm: props.configForm,
                        snapshot: props.channelsSnapshot,
                        loading: props.channelsLoading,
                        error: props.channelsError,
                        lastSuccess: props.channelsLastSuccess,
                        onRefresh: props.onChannelsRefresh,
                      })
                    : nothing
                }
                ${
                  props.activePanel === "cron"
                    ? renderAgentCron({
                        context: buildAgentContext(
                          selectedAgent,
                          props.configForm,
                          props.agentFilesList,
                          defaultId,
                          props.agentIdentityById[selectedAgent.id] ?? null,
                        ),
                        agentId: selectedAgent.id,
                        jobs: props.cronJobs,
                        status: props.cronStatus,
                        loading: props.cronLoading,
                        error: props.cronError,
                        onRefresh: props.onCronRefresh,
                      })
                    : nothing
                }
              `
        }
      </section>
    </div>
  `;
}

function renderAgentHeader(
  agent: AgentsListResult["agents"][number],
  defaultId: string | null,
  agentIdentity: AgentIdentityResult | null,
  onIdentityUpdate: (agentId: string, patch: { name?: string; emoji?: string; avatar?: string }) => void,
) {
  const badge = agentBadgeText(agent.id, defaultId);
  const displayName = normalizeAgentLabel(agent);
  const subtitle = agent.identity?.theme?.trim() || "Agent workspace and routing.";
  const emoji = resolveAgentEmoji(agent, agentIdentity);
  return html`
    <section class="card agent-header">
      <div class="agent-header-main">
        <div 
          class="agent-avatar agent-avatar--lg editable-text" 
          role="button" 
          tabindex="0"
          title="Click to change emoji"
          @click=${() => {
            const next = prompt("Change Identity Emoji:", emoji);
            if (next !== null && next !== emoji) {
              onIdentityUpdate(agent.id, { emoji: next });
            }
          }}
        >${emoji || displayName.slice(0, 1)}</div>
        <div>
          <div 
            class="card-title editable-text" 
            role="button" 
            tabindex="0"
            title="Click to change name"
            @click=${() => {
              const next = prompt("Change Identity Name:", displayName);
              if (next !== null && next !== displayName) {
                onIdentityUpdate(agent.id, { name: next });
              }
            }}
          >${displayName}</div>
          <div class="card-sub">${subtitle}</div>
        </div>
      </div>
      <div class="agent-header-meta">
        <div class="mono">${agent.id}</div>
        ${badge ? html`<span class="agent-pill">${badge}</span>` : nothing}
      </div>
    </section>
  `;
}

function renderAgentTabs(active: AgentsPanel, onSelect: (panel: AgentsPanel) => void) {
  const tabs: Array<{ id: AgentsPanel; label: string }> = [
    { id: "overview", label: "Overview" },
    { id: "files", label: "Files" },
    { id: "tools", label: "Tools" },
    { id: "skills", label: "Skills" },
    { id: "channels", label: "Channels" },
    { id: "cron", label: "Cron Jobs" },
  ];
  return html`
    <div class="agent-tabs">
      ${tabs.map(
        (tab) => html`
          <button
            class="agent-tab ${active === tab.id ? "active" : ""}"
            type="button"
            @click=${() => onSelect(tab.id)}
          >
            ${tab.label}
          </button>
        `,
      )}
    </div>
  `;
}

function renderAgentOverview(params: {
  agent: AgentsListResult["agents"][number];
  defaultId: string | null;
  configForm: Record<string, unknown> | null;
  agentFilesList: AgentsFilesListResult | null;
  agentIdentity: AgentIdentityResult | null;
  agentIdentityLoading: boolean;
  agentIdentityError: string | null;
  configLoading: boolean;
  configSaving: boolean;
  configDirty: boolean;
  onConfigReload: () => void;
  onConfigSave: () => void;
  onModelChange: (agentId: string, modelId: string | null) => void;
  onModelFallbacksChange: (agentId: string, fallbacks: string[]) => void;
  onIdentityUpdate: (agentId: string, patch: { name?: string; emoji?: string; avatar?: string }) => void;
}) {
  const {
    agent,
    configForm,
    agentFilesList,
    agentIdentity,
    agentIdentityLoading,
    agentIdentityError,
    configLoading,
    configSaving,
    configDirty,
    onConfigReload,
    onConfigSave,
    onModelChange,
    onModelFallbacksChange,
    onIdentityUpdate,
  } = params;
  const config = resolveAgentConfig(configForm, agent.id);
  const workspaceFromFiles =
    agentFilesList && agentFilesList.agentId === agent.id ? agentFilesList.workspace : null;
  const workspace =
    workspaceFromFiles || config.entry?.workspace || config.defaults?.workspace || "default";
  const model = config.entry?.model
    ? resolveModelLabel(config.entry?.model)
    : resolveModelLabel(config.defaults?.model);
  const defaultModel = resolveModelLabel(config.defaults?.model);
  const modelPrimary =
    resolveModelPrimary(config.entry?.model) || (model !== "-" ? normalizeModelValue(model) : null);
  const defaultPrimary =
    resolveModelPrimary(config.defaults?.model) ||
    (defaultModel !== "-" ? normalizeModelValue(defaultModel) : null);
  const effectivePrimary = modelPrimary ?? defaultPrimary ?? null;
  const modelFallbacks = resolveModelFallbacks(config.entry?.model);
  const fallbackText = modelFallbacks ? modelFallbacks.join(", ") : "";
  const identityName =
    agentIdentity?.name?.trim() ||
    agent.identity?.name?.trim() ||
    agent.name?.trim() ||
    config.entry?.name ||
    "-";
  const resolvedEmoji = resolveAgentEmoji(agent, agentIdentity);
  const identityEmoji = resolvedEmoji || "-";
  const skillFilter = Array.isArray(config.entry?.skills) ? config.entry?.skills : null;
  const skillCount = skillFilter?.length ?? null;
  const identityStatus = agentIdentityLoading
    ? "Loading…"
    : agentIdentityError
      ? "Unavailable"
      : "";
  const isDefault = Boolean(params.defaultId && agent.id === params.defaultId);

  return html`
    <section class="card">
      <div class="card-title">Overview</div>
      <div class="card-sub">Workspace paths and identity metadata.</div>
      <div class="agents-overview-grid" style="margin-top: 16px;">
        <div class="agent-kv">
          <div class="label">Workspace</div>
          <div class="mono">${workspace}</div>
        </div>
        <div class="agent-kv">
          <div class="label">Primary Model</div>
          <div class="mono">${model}</div>
        </div>
        <div class="agent-kv">
          <div class="label">Identity Name</div>
          <div style="display: flex; align-items: center; gap: 8px;">
            <div 
              class="editable-text" 
              role="button" 
              tabindex="0"
              @click=${() => {
                const next = prompt("Change Identity Name:", identityName);
                if (next !== null && next !== identityName) {
                  onIdentityUpdate(agent.id, { name: next });
                }
              }}
              @keydown=${(e: KeyboardEvent) => { if (e.key === 'Enter') (e.target as HTMLElement).click(); }}
            >
              ${identityName} ${icons.edit ? html`<span class="icon--sm">${icons.edit}</span>` : "✎"}
            </div>
          </div>
          ${identityStatus ? html`<div class="agent-kv-sub muted">${identityStatus}</div>` : nothing}
        </div>
        <div class="agent-kv">
          <div class="label">Default</div>
          <div>${isDefault ? "yes" : "no"}</div>
        </div>
        <div class="agent-kv">
          <div class="label">Identity Emoji</div>
          <div 
            class="editable-text" 
            role="button" 
            tabindex="0"
            @click=${() => {
              const next = prompt("Change Identity Emoji:", identityEmoji);
              if (next !== null && next !== identityEmoji) {
                onIdentityUpdate(agent.id, { emoji: next });
              }
            }}
            @keydown=${(e: KeyboardEvent) => { if (e.key === 'Enter') (e.target as HTMLElement).click(); }}
          >
            ${identityEmoji} ${icons.edit ? html`<span class="icon--sm">${icons.edit}</span>` : "✎"}
          </div>
        </div>
        <div class="agent-kv">
          <div class="label">Skills Filter</div>
          <div>${skillFilter ? `${skillCount} selected` : "all skills"}</div>
        </div>
      </div>

      <div class="agent-model-select" style="margin-top: 20px;">
        <div class="label">Model Selection</div>
        <div class="row" style="gap: 12px; flex-wrap: wrap;">
          <label class="field" style="min-width: 260px; flex: 1;">
            <span>Primary model${isDefault ? " (default)" : ""}</span>
            <select
              .value=${effectivePrimary ?? ""}
              ?disabled=${!configForm || configLoading || configSaving}
              @change=${(e: Event) =>
                onModelChange(agent.id, (e.target as HTMLSelectElement).value || null)}
            >
              ${
                isDefault
                  ? nothing
                  : html`
                      <option value="">
                        ${defaultPrimary ? `Inherit default (${defaultPrimary})` : "Inherit default"}
                      </option>
                    `
              }
              ${buildModelOptions(configForm, effectivePrimary ?? undefined)}
            </select>
          </label>
          <label class="field" style="min-width: 260px; flex: 1;">
            <span>Fallbacks (comma-separated)</span>
            <input
              .value=${fallbackText}
              ?disabled=${!configForm || configLoading || configSaving}
              placeholder="provider/model, provider/model"
              @input=${(e: Event) =>
                onModelFallbacksChange(
                  agent.id,
                  parseFallbackList((e.target as HTMLInputElement).value),
                )}
            />
          </label>
        </div>
        <div class="row" style="justify-content: flex-end; gap: 8px;">
          <button class="btn btn--sm" ?disabled=${configLoading} @click=${onConfigReload}>
            Reload Config
          </button>
          <button
            class="btn btn--sm primary"
            ?disabled=${configSaving || !configDirty}
            @click=${onConfigSave}
          >
            ${configSaving ? "Saving…" : "Save"}
          </button>
        </div>
      </div>
    </section>
  `;
}
