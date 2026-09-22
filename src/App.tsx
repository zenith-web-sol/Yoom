/* eslint-disable react-hooks/exhaustive-deps */
/* eslint-disable react-hooks/set-state-in-effect */
/* eslint-disable react-hooks/refs */
/* eslint-disable react-refresh/only-export-components */
/* eslint-disable @typescript-eslint/no-explicit-any */
import { useEffect, useRef, useState } from "react";
import { ZegoUIKitPrebuilt } from "@zegocloud/zego-uikit-prebuilt";
import {
  Lock,
  Unlock,
  Users,
  Copy,
  Crown,
  Star,
  LogOut,
  X,
  Check,
} from "lucide-react";
import {
  createRoom,
  getRoom,
  listenToRoom,
  setRoomLocked,
  addCoHost,
  removeCoHost,
  endRoom,
  type RoomData,
} from "./roomService";
import ScheduleList from "./ScheduleList";
import { theme as t } from "./theme";

export function getUrlParams(url = window.location.href) {
  const urlStr = url.split("?")[1] || "";
  return new URLSearchParams(urlStr);
}
function randomID(len: number) {
  const chars =
    "12345qwertyuiopasdfgh67890jklmnbvcxzMNBVCZXASDQWERTYHGFUIOLKJP";
  let result = "";
  for (let i = 0; i < len; i++)
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  return result;
}
function getOrCreateUserID() {
  let id = sessionStorage.getItem("zvm_userID");
  if (!id) {
    id = randomID(5);
    sessionStorage.setItem("zvm_userID", id);
  }
  return id;
}
function clearSession() {
  sessionStorage.removeItem("zvm_roomID");
  sessionStorage.removeItem("zvm_userName");
  sessionStorage.removeItem("zvm_password");
}

interface LiveUser {
  userID: string;
  userName: string;
}
interface Toast {
  id: string;
  message: string;
  kind: "lock" | "unlock" | "cohost";
}
type Status =
  | "lobby"
  | "checking"
  | "locked"
  | "kicked"
  | "ended"
  | "wrongPassword"
  | "roomNotFound"
  | "ready";
type Mode = "create" | "join" | "schedule";

function App() {
  const containerRef = useRef<HTMLDivElement>(null);
  const urlRoomID = getUrlParams().get("roomID");

  const [status, setStatus] = useState<Status>("lobby");
  const [mode, setMode] = useState<Mode>(urlRoomID ? "join" : "create");
  const [nameInput, setNameInput] = useState("");
  const [roomIDInput, setRoomIDInput] = useState(urlRoomID || "");
  const [passwordInput, setPasswordInput] = useState("");
  const [copied, setCopied] = useState(false);

  const [roomID, setRoomID] = useState("");
  const [userName, setUserName] = useState("");
  const [roomData, setRoomData] = useState<RoomData | null>(null);
  const [liveUsers, setLiveUsers] = useState<LiveUser[]>([]);
  const [showPanel, setShowPanel] = useState(false);
  const [toasts, setToasts] = useState<Toast[]>([]);

  const userID = useRef(getOrCreateUserID()).current;
  const liveUsersRef = useRef<LiveUser[]>([]);
  const prevRoomDataRef = useRef<RoomData | null>(null);
  const isHostRef = useRef(false);
  const zpRef = useRef<any>(null);

  useEffect(() => {
    liveUsersRef.current = liveUsers;
  }, [liveUsers]);

  const isHost = roomData?.hostID === userID;
  const isCoHost = roomData?.coHostIDs.includes(userID) ?? false;
  const hasModeratorPowers = isHost || isCoHost;

  useEffect(() => {
    isHostRef.current = isHost;
  }, [isHost]);

  function roleOf(id: string): "Host" | "Co-host" | "Participant" {
    if (roomData?.hostID === id) return "Host";
    if (roomData?.coHostIDs.includes(id)) return "Co-host";
    return "Participant";
  }
  function nameOf(id: string) {
    return (
      liveUsersRef.current.find((u) => u.userID === id)?.userName || "Someone"
    );
  }
  function addToast(message: string, kind: Toast["kind"]) {
    const id = randomID(6);
    setToasts((prev) => [...prev, { id, message, kind }]);
    setTimeout(
      () => setToasts((prev) => prev.filter((x) => x.id !== id)),
      4000,
    );
  }
  function handleRoomUpdate(newData: RoomData | null) {
    if (!newData) {
      clearSession();
      setStatus("ended");
      return;
    }
    const prev = prevRoomDataRef.current;
    if (prev) {
      if (prev.locked !== newData.locked)
        addToast(
          newData.locked ? "Meeting locked" : "Meeting unlocked",
          newData.locked ? "lock" : "unlock",
        );
      newData.coHostIDs
        .filter((id) => !prev.coHostIDs.includes(id))
        .forEach((id) =>
          addToast(
            id === userID
              ? "You are now a co-host"
              : `${nameOf(id)} is now a co-host`,
            "cohost",
          ),
        );
      prev.coHostIDs
        .filter((id) => !newData.coHostIDs.includes(id))
        .forEach((id) =>
          addToast(
            id === userID
              ? "You are no longer a co-host"
              : `${nameOf(id)} is no longer a co-host`,
            "cohost",
          ),
        );
    }
    prevRoomDataRef.current = newData;
    setRoomData(newData);
  }

  async function attemptJoin(
    targetRoomID: string,
    name: string,
    password: string,
  ) {
    setStatus("checking");
    const room = await getRoom(targetRoomID);
    if (!room) {
      sessionStorage.removeItem("zvm_roomID");
      setStatus("roomNotFound");
      return;
    }
    if (room.hostID !== userID && room.password && room.password !== password) {
      setStatus("wrongPassword");
      return;
    }
    if (
      room.locked &&
      room.hostID !== userID &&
      !room.coHostIDs.includes(userID)
    ) {
      setStatus("locked");
      return;
    }
    sessionStorage.setItem("zvm_roomID", targetRoomID);
    sessionStorage.setItem("zvm_userName", name);
    sessionStorage.setItem("zvm_password", password);
    setUserName(name);
    setRoomID(targetRoomID);
    prevRoomDataRef.current = room;
    setRoomData(room);
    setStatus("ready");
  }

  useEffect(() => {
    const savedRoomID = sessionStorage.getItem("zvm_roomID");
    const savedUserName = sessionStorage.getItem("zvm_userName");
    const savedPassword = sessionStorage.getItem("zvm_password") || "";
    const targetRoomID = urlRoomID || savedRoomID;
    if (targetRoomID && savedUserName && savedRoomID === targetRoomID) {
      attemptJoin(targetRoomID, savedUserName, savedPassword);
    }
     
  }, []);

  async function handleLobbySubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!nameInput.trim()) return;
    const name = nameInput.trim();
    if (mode === "create") {
      const newRoomID = randomID(5);
      await createRoom(newRoomID, userID, passwordInput.trim());
      window.history.replaceState(null, "", `?roomID=${newRoomID}`);
      await attemptJoin(newRoomID, name, passwordInput.trim());
    } else if (mode === "join") {
      await attemptJoin(roomIDInput.trim(), name, passwordInput.trim());
    }
  }

  useEffect(() => {
    if (status !== "ready" || !roomID) return;
    const unsub = listenToRoom(roomID, handleRoomUpdate);
    return () => unsub();
  }, [status, roomID]);

  useEffect(() => {
    if (status !== "ready" || !containerRef.current) return;
    const appID = parseInt(import.meta.env.VITE_APP_ID);
    const serverSecret = import.meta.env.VITE_SERVER_SECRET;
    const kitToken = ZegoUIKitPrebuilt.generateKitTokenForTest(
      appID,
      serverSecret,
      roomID,
      userID,
      userName,
    );
    const zp = ZegoUIKitPrebuilt.create(kitToken);
    zpRef.current = zp;

    zp.joinRoom({
      container: containerRef.current,
      scenario: { mode: ZegoUIKitPrebuilt.VideoConference },
      sharedLinks: [
        {
          name: "Personal link",
          url:
            window.location.protocol +
            "//" +
            window.location.host +
            window.location.pathname +
            "?roomID=" +
            roomID,
        },
      ],
      showRemoveUserButton: hasModeratorPowers,
      showTurnOffRemoteCameraButton: hasModeratorPowers,
      showTurnOffRemoteMicrophoneButton: hasModeratorPowers,
      onYouRemovedFromRoom: () => {
        clearSession();
        setStatus("kicked");
      },
      onLeaveRoom: async () => {
        clearSession();
        if (isHostRef.current) {
          await endRoom(roomID);
        }
        window.location.href = window.location.pathname;
      },
      onUserJoin: (users: any[]) => {
        setLiveUsers((prev) => {
          const merged = [...prev];
          users.forEach((u) => {
            if (!merged.find((m) => m.userID === u.userID))
              merged.push({ userID: u.userID, userName: u.userName });
          });
          return merged;
        });
      },
      onUserLeave: (users: any[]) =>
        setLiveUsers((prev) =>
          prev.filter((u) => !users.find((x) => x.userID === u.userID)),
        ),
    });
  }, [status, roomID, userID, userName, hasModeratorPowers]);

  // Best-effort fast cleanup when a tab is closed
  useEffect(() => {
    function handleUnload() {
      zpRef.current?.destroy?.();
    }
    window.addEventListener("beforeunload", handleUnload);
    window.addEventListener("pagehide", handleUnload);
    return () => {
      window.removeEventListener("beforeunload", handleUnload);
      window.removeEventListener("pagehide", handleUnload);
    };
  }, []);

  function copyInvite() {
    navigator.clipboard.writeText(
      `Room ID: ${roomID}${roomData?.password ? `\nPassword: ${roomData.password}` : ""}`,
    );
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  function leaveToLobby() {
    clearSession();
    window.location.href = "/";
  }

  // ---------- LOBBY ----------
  if (
    status === "lobby" ||
    status === "wrongPassword" ||
    status === "roomNotFound"
  ) {
    if (mode === "schedule") {
      return (
        <div style={{ minHeight: "100vh", background: t.bgGradient }}>
          <Tabs mode={mode} setMode={setMode} urlRoomID={urlRoomID} />
          <ScheduleList
            userID={userID}
            onJoin={(id) => {
              setRoomIDInput(id);
              setMode("join");
              setStatus("lobby");
            }}
          />
        </div>
      );
    }
    return (
      <div
        style={{
          minHeight: "100vh",
          background: t.bgGradient,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          padding: 20,
        }}
      >
        <div style={{ textAlign: "center", marginBottom: 24 }}>
          <div style={{ fontSize: 26, fontWeight: 700, letterSpacing: -0.5 }}>
            Video Meet
          </div>
          <div style={{ color: t.textMuted, fontSize: 14, marginTop: 4 }}>
            Secure calls, hosted by you
          </div>
        </div>
        <form onSubmit={handleLobbySubmit} className="fade-in" style={card}>
          {!urlRoomID && (
            <Tabs mode={mode} setMode={setMode} urlRoomID={urlRoomID} inline />
          )}
          <Field label="Your name">
            <input
              value={nameInput}
              onChange={(e) => setNameInput(e.target.value)}
              style={input}
              placeholder="e.g. Harshit"
              required
            />
          </Field>
          {mode === "join" && (
            <Field label="Room ID">
              <input
                value={roomIDInput}
                onChange={(e) => setRoomIDInput(e.target.value)}
                style={input}
                required
                disabled={!!urlRoomID}
                placeholder="Enter room ID"
              />
            </Field>
          )}
          <Field label={mode === "create" ? "Password (optional)" : "Password"}>
            <input
              type="password"
              value={passwordInput}
              onChange={(e) => setPasswordInput(e.target.value)}
              style={input}
              placeholder="••••••"
            />
          </Field>
          {status === "wrongPassword" && (
            <ErrorBox text="Wrong password. Try again." />
          )}
          {status === "roomNotFound" && (
            <ErrorBox text="No meeting found with that Room ID." />
          )}
          <button
            type="submit"
            style={{
              ...primaryBtn,
              marginTop: 8,
              width: "100%",
              padding: "12px 0",
            }}
          >
            {mode === "create" ? "Create meeting" : "Join meeting"}
          </button>
        </form>
      </div>
    );
  }

  if (status === "checking")
    return <FullscreenMsg>Reconnecting…</FullscreenMsg>;

  if (status === "locked") {
    return (
      <FullscreenMsg>
        <Lock size={44} color={t.host} />
        <div style={{ fontSize: 20, fontWeight: 700, marginTop: 16 }}>
          This meeting is locked
        </div>
        <div style={{ color: t.textMuted, marginTop: 6, marginBottom: 20 }}>
          The host isn't letting new people in right now.
        </div>
        <div style={{ display: "flex", gap: 10 }}>
          <button
            style={primaryBtn}
            onClick={() =>
              attemptJoin(
                roomID || roomIDInput,
                userName || nameInput,
                passwordInput,
              )
            }
          >
            Try again
          </button>
          <button
            style={{ ...primaryBtn, background: t.surfaceLight }}
            onClick={leaveToLobby}
          >
            Leave
          </button>
        </div>
      </FullscreenMsg>
    );
  }

  if (status === "kicked") {
    return (
      <FullscreenMsg>
        <LogOut size={44} color={t.danger} />
        <div style={{ fontSize: 20, fontWeight: 700, marginTop: 16 }}>
          You've been removed by the host
        </div>
        <button
          style={{ ...primaryBtn, marginTop: 20 }}
          onClick={() => (window.location.href = "/")}
        >
          Return home
        </button>
      </FullscreenMsg>
    );
  }

  if (status === "ended") {
    return (
      <FullscreenMsg>
        <LogOut size={44} color={t.textMuted} />
        <div style={{ fontSize: 20, fontWeight: 700, marginTop: 16 }}>
          This meeting has ended
        </div>
        <div style={{ color: t.textMuted, marginTop: 6, marginBottom: 20 }}>
          The host ended the call for everyone.
        </div>
        <button
          style={{ ...primaryBtn, marginTop: 20 }}
          onClick={() => (window.location.href = "/")}
        >
          Return home
        </button>
      </FullscreenMsg>
    );
  }

  // ---------- CALL SCREEN ----------
  const myRole = roleOf(userID);
  return (
    <div
      style={{
        width: "100vw",
        height: "100vh",
        position: "relative",
        background: t.bg,
      }}
    >
      <div style={topBar}>
        <RoleBadge role={myRole} />
        {isHost && (
          <IconBtn
            active={roomData?.locked}
            onClick={() => setRoomLocked(roomID, !roomData?.locked)}
            icon={roomData?.locked ? <Lock size={14} /> : <Unlock size={14} />}
            label={roomData?.locked ? "Locked" : "Unlocked"}
            color={roomData?.locked ? t.danger : t.success}
          />
        )}
        {hasModeratorPowers && (
          <IconBtn
            onClick={() => setShowPanel((p) => !p)}
            icon={<Users size={14} />}
            label={`${liveUsers.length}`}
          />
        )}
        {isHost && (
          <IconBtn
            onClick={copyInvite}
            icon={copied ? <Check size={14} /> : <Copy size={14} />}
            label={copied ? "Copied" : "Invite"}
          />
        )}
      </div>

      {showPanel && hasModeratorPowers && (
        <div className="fade-in" style={panel}>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: 14,
            }}
          >
            <div style={{ fontWeight: 700, fontSize: 15 }}>Participants</div>
            <X
              size={16}
              style={{ cursor: "pointer", color: t.textMuted }}
              onClick={() => setShowPanel(false)}
            />
          </div>
          {liveUsers.length === 0 && (
            <div style={{ color: t.textMuted, fontSize: 13 }}>
              No one else yet.
            </div>
          )}
          {liveUsers.map((u) => {
            const role = roleOf(u.userID);
            return (
              <div key={u.userID} style={participantRow}>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <Avatar name={u.userName} role={role} />
                  <div>
                    <div style={{ fontSize: 13.5, fontWeight: 500 }}>
                      {u.userName}
                    </div>
                    <RoleBadge role={role} small />
                  </div>
                </div>
                {isHost &&
                  u.userID !== userID &&
                  (role === "Co-host" ? (
                    <button
                      style={smallBtn}
                      onClick={() => removeCoHost(roomID, u.userID)}
                    >
                      Remove
                    </button>
                  ) : (
                    <button
                      style={{ ...smallBtn, background: t.primary }}
                      onClick={() => addCoHost(roomID, u.userID)}
                    >
                      Promote
                    </button>
                  ))}
              </div>
            );
          })}
        </div>
      )}

      <div style={toastStack}>
        {toasts.map((tst) => (
          <div key={tst.id} className="toast-item" style={toastBox}>
            {tst.kind === "lock" && <Lock size={14} color={t.danger} />}
            {tst.kind === "unlock" && <Unlock size={14} color={t.success} />}
            {tst.kind === "cohost" && <Star size={14} color={t.coHost} />}
            <span style={{ fontSize: 13 }}>{tst.message}</span>
          </div>
        ))}
      </div>

      <div ref={containerRef} style={{ width: "100%", height: "100%" }}></div>
    </div>
  );
}

function Tabs({ mode, setMode, urlRoomID, inline }: any) {
  if (urlRoomID) return null;
  return (
    <div
      style={{
        display: "flex",
        gap: 6,
        marginBottom: inline ? 18 : 0,
        justifyContent: "center",
        padding: inline ? 0 : "20px 0",
      }}
    >
      {(["create", "join", "schedule"] as Mode[]).map((m) => (
        <button
          key={m}
          type="button"
          onClick={() => setMode(m)}
          style={tabBtn(mode === m)}
        >
          {m === "create" ? "Create" : m === "join" ? "Join" : "Scheduled"}
        </button>
      ))}
    </div>
  );
}
function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div style={{ marginBottom: 14 }}>
      <div
        style={{
          fontSize: 12,
          color: t.textMuted,
          marginBottom: 6,
          fontWeight: 500,
        }}
      >
        {label}
      </div>
      {children}
    </div>
  );
}
function ErrorBox({ text }: { text: string }) {
  return (
    <div
      style={{
        background: "rgba(239,68,68,0.1)",
        border: `1px solid ${t.danger}`,
        color: "#f87171",
        fontSize: 12.5,
        padding: "8px 10px",
        borderRadius: 8,
        marginBottom: 10,
      }}
    >
      {text}
    </div>
  );
}
function FullscreenMsg({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        height: "100vh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        background: t.bgGradient,
        color: t.text,
        textAlign: "center",
        padding: 20,
      }}
    >
      {children}
    </div>
  );
}
function RoleBadge({ role, small }: { role: string; small?: boolean }) {
  const color =
    role === "Host" ? t.host : role === "Co-host" ? t.coHost : t.participant;
  const Icon = role === "Host" ? Crown : role === "Co-host" ? Star : null;
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 4,
        background: `${color}22`,
        color,
        padding: small ? "1px 7px" : "5px 11px",
        borderRadius: 20,
        fontSize: small ? 10.5 : 12.5,
        fontWeight: 600,
        border: `1px solid ${color}44`,
      }}
    >
      {Icon && <Icon size={small ? 10 : 12} />} {role}
    </span>
  );
}
function Avatar({ name, role }: { name: string; role: string }) {
  const color =
    role === "Host" ? t.host : role === "Co-host" ? t.coHost : t.participant;
  return (
    <div
      style={{
        width: 30,
        height: 30,
        borderRadius: "50%",
        background: color,
        color: "#000",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontSize: 13,
        fontWeight: 700,
        flexShrink: 0,
      }}
    >
      {name.charAt(0).toUpperCase()}
    </div>
  );
}
function IconBtn({ icon, label, onClick, active, color }: any) {
  return (
    <button
      onClick={onClick}
      style={{
        display: "flex",
        alignItems: "center",
        gap: 6,
        background: active !== undefined ? `${color}22` : t.surfaceLight,
        border: `1px solid ${active !== undefined ? color + "55" : t.border}`,
        color: active !== undefined ? color : t.text,
        padding: "7px 13px",
        borderRadius: 20,
        fontSize: 12.5,
        fontWeight: 600,
        cursor: "pointer",
        backdropFilter: "blur(8px)",
      }}
    >
      {icon} {label}
    </button>
  );
}

const card: React.CSSProperties = {
  background: t.surface,
  border: `1px solid ${t.border}`,
  padding: 28,
  borderRadius: 18,
  width: 340,
  boxShadow: "0 20px 40px rgba(0,0,0,0.5)",
};
const tabBtn = (active: boolean): React.CSSProperties => ({
  flex: 1,
  padding: "9px 0",
  borderRadius: 10,
  border: "none",
  cursor: "pointer",
  background: active ? t.primary : t.surfaceLight,
  color: active ? "#fff" : t.textMuted,
  fontWeight: 600,
  fontSize: 13,
});
const input: React.CSSProperties = {
  width: "100%",
  padding: "11px 13px",
  borderRadius: 10,
  border: `1px solid ${t.border}`,
  background: t.bg,
  color: t.text,
  fontSize: 14,
  outline: "none",
};
const primaryBtn: React.CSSProperties = {
  background: t.primary,
  color: "#fff",
  border: "none",
  padding: "10px 20px",
  borderRadius: 10,
  fontSize: 14,
  fontWeight: 600,
  cursor: "pointer",
};
const topBar: React.CSSProperties = {
  position: "absolute",
  top: 16,
  left: 16,
  zIndex: 999,
  display: "flex",
  gap: 8,
  alignItems: "center",
};
const panel: React.CSSProperties = {
  position: "absolute",
  top: 64,
  left: 16,
  zIndex: 999,
  background: "rgba(21,21,31,0.97)",
  backdropFilter: "blur(12px)",
  border: `1px solid ${t.border}`,
  padding: 16,
  borderRadius: 14,
  width: 270,
  maxHeight: "65vh",
  overflowY: "auto",
};
const participantRow: React.CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  padding: "9px 0",
  borderBottom: `1px solid ${t.border}`,
};
const smallBtn: React.CSSProperties = {
  background: t.surfaceLight,
  border: `1px solid ${t.border}`,
  color: t.text,
  padding: "5px 10px",
  borderRadius: 8,
  fontSize: 11.5,
  cursor: "pointer",
  fontWeight: 500,
};
const toastStack: React.CSSProperties = {
  position: "absolute",
  bottom: 100,
  right: 16,
  zIndex: 999,
  display: "flex",
  flexDirection: "column",
  gap: 8,
  alignItems: "flex-end",
};
const toastBox: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 8,
  background: "rgba(21,21,31,0.97)",
  backdropFilter: "blur(10px)",
  border: `1px solid ${t.border}`,
  color: "#fff",
  padding: "10px 14px",
  borderRadius: 10,
  boxShadow: "0 8px 20px rgba(0,0,0,0.4)",
};

export default App;
