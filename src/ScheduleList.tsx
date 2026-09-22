/* eslint-disable react-hooks/purity */
/* eslint-disable react-hooks/exhaustive-deps */
/* eslint-disable react-hooks/set-state-in-effect */
import { useEffect, useState } from "react";
import { Plus, Calendar } from "lucide-react";
import { createRoom, getMyScheduledMeetings, type RoomData } from "./roomService";
import { theme as t } from "./theme";

function randomID(len: number) {
  const chars =
    "12345qwertyuiopasdfgh67890jklmnbvcxzMNBVCZXASDQWERTYHGFUIOLKJP";
  let result = "";
  for (let i = 0; i < len; i++)
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  return result;
}

interface Props {
  userID: string;
  onJoin: (roomID: string) => void;
}

export default function ScheduleList({ userID, onJoin }: Props) {
  const [meetings, setMeetings] = useState<(RoomData & { roomID: string })[]>(
    [],
  );
  const [showForm, setShowForm] = useState(false);
  const [title, setTitle] = useState("");
  const [dateInput, setDateInput] = useState("");
  const [password, setPassword] = useState("");

  async function refresh() {
    setMeetings(await getMyScheduledMeetings(userID));
  }
  useEffect(() => {
    refresh();
  }, [userID]);

  async function handleSchedule(e: React.FormEvent) {
    e.preventDefault();
    const roomID = randomID(5);
    await createRoom(
      roomID,
      userID,
      password.trim(),
      new Date(dateInput).getTime(),
      title.trim() || "Untitled meeting",
    );
    setShowForm(false);
    setTitle("");
    setDateInput("");
    setPassword("");
    refresh();
  }
  function isJoinable(scheduledFor: number | null) {
    return !scheduledFor || Date.now() >= scheduledFor - 5 * 60 * 1000;
  }

  return (
    <div style={{ maxWidth: 460, margin: "24px auto", padding: "0 16px" }}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 18,
        }}
      >
        <div style={{ fontSize: 18, fontWeight: 700 }}>Upcoming meetings</div>
        <button onClick={() => setShowForm((s) => !s)} style={btn}>
          <Plus size={14} /> Schedule
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleSchedule} className="fade-in" style={formBox}>
          <input
            placeholder="Meeting title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            style={input}
            required
          />
          <input
            type="datetime-local"
            value={dateInput}
            onChange={(e) => setDateInput(e.target.value)}
            style={input}
            required
          />
          <input
            placeholder="Password (optional)"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            style={input}
          />
          <button
            type="submit"
            style={{ ...btn, width: "100%", justifyContent: "center" }}
          >
            Save meeting
          </button>
        </form>
      )}

      {meetings.length === 0 && (
        <div
          style={{ textAlign: "center", padding: "40px 0", color: t.textMuted }}
        >
          <Calendar size={30} style={{ opacity: 0.4, marginBottom: 8 }} />
          <div style={{ fontSize: 13 }}>No scheduled meetings yet.</div>
        </div>
      )}

      {meetings.map((m) => {
        const joinable = isJoinable(m.scheduledFor);
        return (
          <div key={m.roomID} style={mCard}>
            <div>
              <div style={{ fontWeight: 600, fontSize: 14.5 }}>{m.title}</div>
              <div style={{ fontSize: 12.5, color: t.textMuted, marginTop: 2 }}>
                {m.scheduledFor
                  ? new Date(m.scheduledFor).toLocaleString()
                  : "No time set"}
              </div>
              <div style={{ fontSize: 11, color: "#5c5c6e", marginTop: 4 }}>
                ID: {m.roomID}
                {m.password ? ` · Password set` : ""}
              </div>
            </div>
            <button
              style={{
                ...btn,
                opacity: joinable ? 1 : 0.35,
                cursor: joinable ? "pointer" : "default",
              }}
              disabled={!joinable}
              onClick={() => onJoin(m.roomID)}
            >
              {joinable ? "Join" : "Not yet"}
            </button>
          </div>
        );
      })}
    </div>
  );
}

const btn: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 6,
  background: t.primary,
  color: "#fff",
  border: "none",
  padding: "9px 16px",
  borderRadius: 10,
  cursor: "pointer",
  fontSize: 13,
  fontWeight: 600,
};
const formBox: React.CSSProperties = {
  background: t.surface,
  border: `1px solid ${t.border}`,
  padding: 16,
  borderRadius: 14,
  display: "flex",
  flexDirection: "column",
  gap: 10,
  marginBottom: 20,
};
const input: React.CSSProperties = {
  padding: "10px 12px",
  borderRadius: 9,
  border: `1px solid ${t.border}`,
  background: t.bg,
  color: t.text,
  fontSize: 13.5,
  colorScheme: "dark",
};
const mCard: React.CSSProperties = {
  background: t.surface,
  border: `1px solid ${t.border}`,
  padding: 14,
  borderRadius: 12,
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  marginBottom: 10,
};
