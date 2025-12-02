document.getElementById("complianceForm").addEventListener("submit", function(e){
    e.preventDefault();

    let form = new FormData(e.target);
    let score = 0;
    let total = 9;

    form.forEach((value) => {
        if(value === "yes") score++;
    });

    let percentage = Math.round((score / total) * 100);

    window.location.href = "result.html?score=" + percentage;
});
