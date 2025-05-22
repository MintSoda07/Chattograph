import { doc, getDoc } from "firebase/firestore";
import { db } from "../firebase";

export async function fetchGptApiKey(): Promise<string | null> {
    try {
        const docRef = doc(db, "API", "gpt");
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
            return docSnap.data().key;
        } else {
            console.warn("GPT API 문서가 존재하지 않습니다.");
            return null;
        }
    } catch (e) {
        console.error("GPT API 키 가져오기 실패:", e);
        return null;
    }
}
