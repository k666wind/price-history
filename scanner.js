const scanner = new Html5Qrcode("reader");

scanner.start(
  { facingMode: "environment" },
  {},
  (code) => {
    document.getElementById("product").value = code;
  }
);
