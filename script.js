document.getElementById("complianceForm").addEventListener("submit", function(e){
    e.preventDefault();

    let form = new FormData(e.target);

    let businessName = form.get("businessName");
    let email = form.get("email");

    let score = 0;
    let total = 9;

    form.forEach((value, key) => {
        if(key !== "businessName" && key !== "email" && value === "yes") {
            score++;
        }
    });

    let percentage = Math.round((score / total) * 100);

    // SEND TO FORMSUBMIT (replace placeholder email)
    fetch("https://formsubmit.co/YOUR-FORMSUBMIT-EMAIL", {
        method: "POST",
        body: form
    });

    window.location.href = 
        "result.html?score=" + percentage + 
        "&business=" + encodeURIComponent(businessName);
});
