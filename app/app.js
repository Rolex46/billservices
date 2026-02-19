var currentRecord = null;
var currentRecordId = null;

ZOHO.embeddedApp.on("PageLoad", function (data) {
    var Entity = data.Entity;
    var recordId = data.EntityId[0];
    currentRecordId = recordId;

    ZOHO.CRM.API.getRecord({
        Entity: Entity,
        RecordID: recordId
    }).then(function (response) {
        currentRecord = response.data[0];
        renderWidget(currentRecord);
    });

});

function renderWidget(record) {
    document.getElementById("deal-name").textContent = record.Deal_Name || "";
    document.getElementById("patient-info").textContent =
        (record.Patient_Number || "") + "  |  " + (record.Contact_Name ? record.Contact_Name.name : "");
    document.getElementById("visit-no").textContent = record.OP_Visit_No || "";

    var services = record.Services_Offered || [];
    var tbody = document.getElementById("services-body");
    tbody.innerHTML = "";

    if (services.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" class="empty">No services found.</td></tr>';
    } else {
        services.forEach(function (svc) {
            var isBilled = svc.Invoice_Status === "Billed";
            var total = svc.Total || 0;

            var tr = document.createElement("tr");
            tr.className = isBilled ? "billed-row" : "";
            tr.dataset.id = svc.id;
            tr.dataset.total = total;

            tr.innerHTML =
                '<td class="col-check">' +
                (isBilled
                    ? '<span class="billed-badge">Billed</span>'
                    : '<input type="checkbox" class="svc-checkbox" data-total="' + total + '">') +
                '</td>' +
                '<td class="col-category">' + (svc.Product_Category || "-") + '</td>' +
                '<td class="col-service">' + (svc.Service ? svc.Service.name : "-") + '</td>' +
                '<td class="col-qty">' + (svc.Quantity || 1) + '</td>' +
                '<td class="col-price">KES ' + formatAmount(svc.Price || 0) + '</td>' +
                '<td class="col-total">KES ' + formatAmount(total) + '</td>';

            tbody.appendChild(tr);
        });
    }

    document.getElementById("select-all").addEventListener("change", function () {
        var checked = this.checked;
        document.querySelectorAll(".svc-checkbox").forEach(function (cb) {
            cb.checked = checked;
        });
        updateSummary();
    });

    tbody.addEventListener("change", function (e) {
        if (e.target.classList.contains("svc-checkbox")) {
            updateSummary();
        }
    });

    document.getElementById("bill-btn").addEventListener("click", function () {
        var selectedIds = Array.from(document.querySelectorAll(".svc-checkbox:checked")).map(function (cb) {
            return cb.closest("tr").dataset.id;
        });
        var selectedServices = (currentRecord.Services_Offered || [])
            .filter(function (svc) { return selectedIds.indexOf(svc.id) !== -1; })
            .map(function (svc) {
                return {
                    name: svc.Service ? svc.Service.name : "",
                    quantity: svc.Quantity || 1,
                    rate: svc.Price || 0
                };
            });
        var args = {
            "dealId": currentRecordId,
            "lineservices": { "items": selectedServices }
        };
        // console.log("Arguments being sent:", JSON.stringify(args, null, 2));

        ZOHO.CRM.FUNCTIONS.execute("combinedserviceinvoice", {
            "arguments": JSON.stringify(args)
        }).then(function(result) {
            console.log("Function result:", result);
        });
    });

    document.getElementById("loading").classList.add("hidden");
    document.getElementById("widget").classList.remove("hidden");
}

function updateSummary() {
    var checked = Array.from(document.querySelectorAll(".svc-checkbox:checked"));
    var total = checked.reduce(function (sum, cb) {
        return sum + parseFloat(cb.dataset.total || 0);
    }, 0);
    document.getElementById("selected-total").textContent = "KES " + formatAmount(total);
    document.getElementById("bill-btn").disabled = checked.length === 0;
}

function formatAmount(n) {
    return parseFloat(n).toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

ZOHO.embeddedApp.init();
