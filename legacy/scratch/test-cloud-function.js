const url = "https://asia-southeast1-readchill.cloudfunctions.net/verifySlip";

fetch(url, {
    method: "POST",
    headers: {
        "Content-Type": "application/json"
    },
    body: JSON.stringify({ 
        url: "test",
        apikey: "SLIPOKPHXCCC8"
    })
})
.then(res => res.text())
.then(data => console.log("Response:", data))
.catch(err => console.error("Error:", err));
