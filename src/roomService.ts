import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  arrayUnion,
  arrayRemove,
  onSnapshot,
  collection,
  query,
  where,
  orderBy,
  getDocs,
} from "firebase/firestore";
import { db } from "./firebase";

export interface RoomData {
  hostID: string;
  coHostIDs: string[];
  locked: boolean;
  password: string;
  scheduledFor: number | null;
  title: string;
}

export async function createRoom(
  roomID: string,
  hostID: string,
  password: string,
  scheduledFor: number | null = null,
  title: string = "Untitled meeting",
) {
  const roomRef = doc(db, "rooms", roomID);
  const roomData: RoomData = {
    hostID,
    coHostIDs: [],
    locked: false,
    password,
    scheduledFor,
    title,
  };
  await setDoc(roomRef, roomData);
  return roomData;
}

export async function getRoom(roomID: string): Promise<RoomData | null> {
  const snap = await getDoc(doc(db, "rooms", roomID));
  return snap.exists() ? (snap.data() as RoomData) : null;
}

// callback now receives null when the room has been deleted/ended
export function listenToRoom(
  roomID: string,
  callback: (data: RoomData | null) => void,
) {
  return onSnapshot(doc(db, "rooms", roomID), (snap) => {
    callback(snap.exists() ? (snap.data() as RoomData) : null);
  });
}

export async function setRoomLocked(roomID: string, locked: boolean) {
  await updateDoc(doc(db, "rooms", roomID), { locked });
}
export async function addCoHost(roomID: string, userID: string) {
  await updateDoc(doc(db, "rooms", roomID), { coHostIDs: arrayUnion(userID) });
}
export async function removeCoHost(roomID: string, userID: string) {
  await updateDoc(doc(db, "rooms", roomID), { coHostIDs: arrayRemove(userID) });
}

// Host ending the call — deletes the room so nobody can rejoin a dead meeting
export async function endRoom(roomID: string) {
  await deleteDoc(doc(db, "rooms", roomID));
}

export async function getMyScheduledMeetings(hostID: string) {
  const q = query(
    collection(db, "rooms"),
    where("hostID", "==", hostID),
    where("scheduledFor", "!=", null),
    orderBy("scheduledFor", "asc"),
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ roomID: d.id, ...(d.data() as RoomData) }));
}
