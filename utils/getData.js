import firebase_app from "./firebase";
import { getFirestore, doc, getDoc } from "firebase/firestore";

const db = getFirestore(firebase_app)
export const getDoument = async (collection, id) => {
    let docRef = doc(db, collection, id);

    let result = null;
    let error = null;

    try {
        result = await getDoc(docRef);
    } catch (e) {
        error = e;
    }

    return { result, error };
}
