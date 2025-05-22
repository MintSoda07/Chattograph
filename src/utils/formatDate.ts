export function formatDate(date: Date): string {
    const year = date.getFullYear();
    const month = (date.getMonth() + 1).toString().padStart(2, "0");
    const day = date.getDate().toString().padStart(2, "0");
    const hours24 = date.getHours();
    const minutes = date.getMinutes().toString().padStart(2, "0");
    const ampm = hours24 >= 12 ? "오후" : "오전";
    const hours12 = hours24 % 12 === 0 ? 12 : hours24 % 12;
    return `${year}-${month}-${day} ${ampm} ${hours12.toString().padStart(2, "0")}:${minutes}`;
}
