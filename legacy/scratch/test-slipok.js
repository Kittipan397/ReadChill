
const branchId = "69617";
const slipUrl = "https://example.com/slip.jpg";
const targetUrl = `https://api.slipok.com/api/line/apikey/${branchId}`;
const proxyUrl = `https://corsproxy.io/?${encodeURIComponent(targetUrl)}`;

fetch(proxyUrl, {
    method: "POST",
    headers: {
        "x-authorization": "SLIPOKPHXCCC8",
        "Content-Type": "application/json"
    },
    body: JSON.stringify({ url: slipUrl })
})
.then(res => res.json())
.then(data => console.log("Response:", data))
.catch(err => console.error("Error:", err));
