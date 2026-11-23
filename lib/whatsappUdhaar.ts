export function sendUdhaarWhatsApp(
  partyName: string, phone: string, partyType: "CUSTOMER" | "SUPPLIER",
  txType: "UDHAAR" | "PAYMENT", oldBal: number, amount: number, items: string
) {
  const newBal = txType === "UDHAAR" ? oldBal + amount : oldBal - amount;
  const now = new Date();
  const dateStr = now.toLocaleDateString("en-IN");
  const timeStr = now.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" });
  const label = partyType === "CUSTOMER"
    ? (txType === "UDHAAR" ? `+ ₹${amount} (माल उधार दिया: ${items})` : `- ₹${amount} (उधार जमा प्राप्त)`)
    : (txType === "UDHAAR" ? `+ ₹${amount} (माल उधार लिया: ${items})` : `- ₹${amount} (पेमेंट भुगतान किया)`);
  const msg = `*VyapaarSetu - डिजिटल खाता*%0Aनमस्ते *${partyName}*,%0Aदिनांक: ${dateStr} | समय: ${timeStr}%0A%0A• पुराना बकाया: ₹${oldBal}%0A• आज का लेन-देन: ${label}%0A------------------------%0A*कुल शेष राशि: ₹${newBal}*%0A%0Aधन्यवाद!`;
  const cleanPhone = phone.replace(/\D/g, "").slice(-10);
  window.open(`https://wa.me{cleanPhone}?text=${msg}`, "_blank");
  return newBal;
}