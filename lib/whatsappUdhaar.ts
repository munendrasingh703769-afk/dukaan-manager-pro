export function sendUdhaarWhatsApp(
  partyName: string, phone: string, partyType: "CUSTOMER" | "SUPPLIER",
  txType: "UDHAAR" | "PAYMENT", oldBal: number, amount: number, items: string, lang: "hi" | "en" = "hi"
) {
  const newBal = txType === "UDHAAR" ? oldBal + amount : oldBal - amount;
  const now = new Date();
  const dateStr = now.toLocaleDateString("en-IN");
  const timeStr = now.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" });
  const label = lang === "hi"
    ? (partyType === "CUSTOMER"
      ? (txType === "UDHAAR" ? "+ ₹" + amount + " (माल उधार दिया: " + items + ")" : "- ₹" + amount + " (उधार जमा प्राप्त)")
      : (txType === "UDHAAR" ? "+ ₹" + amount + " (माल उधार लिया: " + items + ")" : "- ₹" + amount + " (पेमेंट भुगतान किया)"))
    : (partyType === "CUSTOMER"
      ? (txType === "UDHAAR" ? "+ ₹" + amount + " (Goods Sold on Credit: " + items + ")" : "- ₹" + amount + " (Payment Received)")
      : (txType === "UDHAAR" ? "+ ₹" + amount + " (Goods Purchased on Credit: " + items + ")" : "- ₹" + amount + " (Payment Paid)"));
  const msg = lang === "hi"
    ? "*VyapaarSetu - डिजिटल खाता*%0Aनमस्ते *" + partyName + "*,%0Aदिनांक: " + dateStr + " | समय: " + timeStr + "%0A%0A• पुराना बकाया: ₹" + oldBal + "%0A• आज का लेन-देन: " + label + "%0A------------------------%0A*कुल शेष राशि: ₹" + newBal + "*%0A%0Aधन्यवाद!"
    : "*VyapaarSetu - Digital Ledger*%0AHello *" + partyName + "*,%0ADate: " + dateStr + " | Time: " + timeStr + "%0A%0A• Previous Balance: ₹" + oldBal + "%0A• Today Transaction: " + label + "%0A------------------------%0A*Total Remaining Balance: ₹" + newBal + "*%0A%0AThank you!";
  const cleanPhone = phone.replace(/\D/g, "").slice(-10);
  window.open("https://wa.me" + cleanPhone + "?text=" + encodeURIComponent(decodeURIComponent(msg)), "_blank");
  return newBal;
}