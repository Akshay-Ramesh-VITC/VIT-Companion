(() => {
  "use strict";

  const APPLIED_FLAG = "vitCmMarksEnhanced";

  const isMarksPage = () => document.querySelectorAll(".customTable-level1 > tbody").length > 0;

  const isApplied = () => {
    if (document.body?.dataset?.[APPLIED_FLAG] === "1") {
      return true;
    }
    return Boolean(document.querySelector(".tableContent-level1 b")?.textContent?.includes("Lost Weightage Marks"));
  };

  const modifyMarksPage = () => {
    if (!isMarksPage() || isApplied()) {
      return;
    }

    let colspan = 8;
    const tables = document.querySelectorAll(".customTable-level1 > tbody");
    const subjectHeader = Array.from(document.querySelectorAll(".tableContent"));
    let i = 0;

    for (let j = 0; j < tables.length; j += 1) {
      let other = false;
      const subHeaderRow = subjectHeader[i]?.getElementsByTagName("td");
      const subType = subHeaderRow?.[4]?.innerHTML || "";
      i += 2;

      let totMaxMarks = 0;
      let totWeightagePercent = 0;
      let totScored = 0;
      let totWeightageEqui = 0;
      let totClassAvg = 0;

      let tableMarks = tables[j].querySelectorAll(".tableContent-level1");
      tableMarks = Array.from(tableMarks);

      for (let k = 0; k < tableMarks.length; k += 1) {
        if (tableMarks[k].style.background !== "") {
          other = true;
          colspan = 11;
          continue;
        }

        const content = tableMarks[k].innerHTML.split("<td>");
        const maxMarks = content[3]?.replace(/[^0-9.]+/g, "") || "0";
        const weightagePercent = content[4]?.replace(/[^0-9.]+/g, "") || "0";
        const scored = content[6]?.replace(/[^0-9.]+/g, "") || "0";
        const weightageEqui = content[7]?.replace(/[^0-9.]+/g, "") || "0";
        const classAvg = content[8]?.replace(/[^0-9.]+/g, "") || "0";

        totMaxMarks += parseFloat(maxMarks) || 0;
        totWeightagePercent += parseFloat(weightagePercent) || 0;
        totScored += parseFloat(scored) || 0;
        totWeightageEqui += parseFloat(weightageEqui) || 0;
        totClassAvg += parseFloat(classAvg) || 0;
      }

      if (!other) {
        tables[j].innerHTML += `
        <tr class="tableContent-level1" style="background: rgb(60,141,188,0.8);">
            <td></td>
            <td><b>Total:</b></td>
            <td>${totMaxMarks.toFixed(2)}</td>
            <td>${totWeightagePercent.toFixed(2)}</td>
            <td></td>
            <td><b>${totScored.toFixed(2)}</b></td>
            <td><b>${totWeightageEqui.toFixed(2)}</b></td>
            <td><b>Lost Weightage Marks: ${(totWeightagePercent - totWeightageEqui).toFixed(2)}</b></td>
        </tr>
        `;
      } else {
        tables[j].innerHTML += `
        <tr class="tableContent-level1" style="background: rgb(60,141,188,0.8);">
            <td></td>
            <td><b>Total:</b></td>
            <td>${totMaxMarks.toFixed(2)}</td>
            <td>${totWeightagePercent.toFixed(2)}</td>
            <td></td>
            <td><b>${totScored.toFixed(2)}</b></td>
            <td><b>${totWeightageEqui.toFixed(2)}</b></td>
            <td>${totClassAvg.toFixed(2)}</td>
            <td> </td>
            <td><b>Lost Weightage Marks:</b></td>
            <td>${(totWeightagePercent - totWeightageEqui).toFixed(2)}</td>
        </tr>
        `;
      }

      let passMarks;
      if (subType.includes("Theory") && totWeightagePercent === 60) {
        if (totWeightageEqui >= 34) {
          passMarks = 40;
          tables[j].innerHTML += `
          <tr class="tableContent-level1" style="background: rgb(170, 255, 0,0.6);">
              <td colspan="${colspan}" style="text-align:center">You need only ${passMarks} marks out of 100 in FAT to pass theory component.🥳 </td>
          </tr>
          `;
        } else {
          passMarks = (34 - totWeightageEqui) * 2.5 + 40;
          tables[j].innerHTML += `
          <tr class="tableContent-level1" style="background: rgb(255,0,0,0.6);">
              <td colspan="${colspan}" style="text-align:center"><b>Minimum marks required to clear this component is: ${passMarks.toFixed(2)} in FAT</b></td>
          </tr>
          `;
        }
      
      }else if(subType.includes("Theory") && totWeightagePercent === 100){
        if(totWeightageEqui >= 90){
          tables[j].innerHTML += `
          <tr class="tableContent-level1" style="background: rgb(0, 255, 0,0.6);">
              <td colspan="${colspan}" style="text-align:center">You have chance of getting S grade !!🥳</td>
          </tr>
          `;
        }else if(totWeightageEqui >= 80 && totWeightageEqui < 90){
          tables[j].innerHTML += `
          <tr class="tableContent-level1" style="background: rgb(152, 251, 152, 0.6);">
              <td colspan="${colspan}" style="text-align:center">You have chance of getting A grade !!🥳</td>
          </tr>
          `;
        } else if(totWeightageEqui >= 70 && totWeightageEqui < 80){
          tables[j].innerHTML += `
          <tr class="tableContent-level1" style="background: rgb(255, 255, 0, 0.6);">
              <td colspan="${colspan}" style="text-align:center">You have chance of getting B grade !!🥳</td>
          </tr>
          `;
        } else if(totWeightageEqui >= 60 && totWeightageEqui < 70){
          tables[j].innerHTML += `
          <tr class="tableContent-level1" style="background: rgb(255, 150, 0,0.6);">
              <td colspan="${colspan}" style="text-align:center">You have chance of getting C grade !!🥳</td>
          </tr>
          `;
        } else if(totWeightageEqui >= 50 && totWeightageEqui < 60){
          tables[j].innerHTML += `
          <tr class="tableContent-level1" style="background: rgb(255, 100, 0,0.6);">
              <td colspan="${colspan}" style="text-align:center">You have chance of getting D grade !!🥳</td>
          </tr>
          `;
        } else if(totWeightageEqui >= 40 && totWeightageEqui < 50){
          tables[j].innerHTML += `
          <tr class="tableContent-level1" style="background: rgb(255, 50, 0,0.6);">
              <td colspan="${colspan}" style="text-align:center">You have chance of getting E grade !!🥳</td>
          </tr>
          `;
        }
      } 
      
      else if ((subType.includes("Lab") || subType.includes("Online")) && totWeightagePercent === 60) {
        if (totWeightageEqui >= 50) {
          tables[j].innerHTML += `
          <tr class="tableContent-level1" style="background: rgb(170, 255, 0,0.6);">
              <td colspan="${colspan}" style="text-align:center">You have fulfilled the criteria of passing the Lab Component. 🥳</td>
          </tr>
          `;
        } else {
          passMarks = 50 - totWeightageEqui;
          tables[j].innerHTML += `
          <tr class="tableContent-level1" style="background: rgb(255,0,0,0.6);">
              <td colspan="${colspan}" style="text-align:center"><b>Minimum marks required to clear this component is: ${passMarks.toFixed(2)} in FAT</b></td>
          </tr>
          `;
        }
      } else if((subType.includes("Lab") || subType.includes("Online")) && totWeightagePercent === 100) {
        if(totWeightageEqui >= 90){
          tables[j].innerHTML += `
          <tr class="tableContent-level1" style="background: rgb(0, 255, 0,0.6);">
              <td colspan="${colspan}" style="text-align:center">You have got S grade !!🥳</td>
          </tr>
          `;
        } else if(totWeightageEqui >= 80 && totWeightageEqui < 90){
          tables[j].innerHTML += `
          <tr class="tableContent-level1" style="background: rgb(255, 255, 0,0.6);">
              <td colspan="${colspan}" style="text-align:center">You have got A grade !!🥳</td>
          </tr>
          `;
        } else if(totWeightageEqui >= 70 && totWeightageEqui < 80){
          tables[j].innerHTML += `
          <tr class="tableContent-level1" style="background: rgb(255, 200, 0,0.6);">
              <td colspan="${colspan}" style="text-align:center">You have got B grade !!🥳</td>
          </tr>
          `;
        } else if(totWeightageEqui >= 60 && totWeightageEqui < 70){
          tables[j].innerHTML += `
          <tr class="tableContent-level1" style="background: rgb(255, 150, 0,0.6);">
              <td colspan="${colspan}" style="text-align:center">You have got C grade !!🥳</td>
          </tr>
          `;
        } else if(totWeightageEqui >= 50 && totWeightageEqui < 60){
          tables[j].innerHTML += `
          <tr class="tableContent-level1" style="background: rgb(255, 100, 0,0.6);">
              <td colspan="${colspan}" style="text-align:center">You have got D grade !!🥳</td>
          </tr>
          `;
        } else if(totWeightageEqui >= 40 && totWeightageEqui < 50){
          tables[j].innerHTML += `
          <tr class="tableContent-level1" style="background: rgb(255, 50, 0,0.6);">
              <td colspan="${colspan}" style="text-align:center">You have got E grade !!🥳</td>
          </tr>
          `;
        }
      } else if (subType.includes("Soft") && totWeightagePercent === 60) {
        if (totWeightageEqui >= 50) {
          tables[j].innerHTML += `
          <tr class="tableContent-level1" style="background: rgb(170, 255, 0,0.6);">
              <td colspan="${colspan}" style="text-align:center">You have fulfilled the criteria of passing the STS. 🥳</td>
          </tr>
          `;
        } else {
          passMarks = 50 - totWeightageEqui;
          tables[j].innerHTML += `
          <tr class="tableContent-level1" style="background: rgb(255,0,0,0.6);">
              <td colspan="${colspan}" style="text-align:center"><b>Minimum marks required to clear STS is: ${passMarks.toFixed(2)} marks</b></td>
          </tr>
          `;
        }
      }
        else if(subType.includes("Soft") && totWeightagePercent === 100) {
          if(totWeightageEqui >= 90){
            tables[j].innerHTML += `
            <tr class="tableContent-level1" style="background: rgb(0, 255, 0,0.6);">
                <td colspan="${colspan}" style="text-align:center">You have got S grade !!🥳</td>
            </tr>
            `;
          } else if(totWeightageEqui >= 80 && totWeightageEqui < 90){
            tables[j].innerHTML += `
            <tr class="tableContent-level1" style="background: rgb(255, 255, 0,0.6);">
                <td colspan="${colspan}" style="text-align:center">You have got A grade !!🥳</td>
            </tr>
            `;
          } else if(totWeightageEqui >= 70 && totWeightageEqui < 80){
            tables[j].innerHTML += `
            <tr class="tableContent-level1" style="background: rgb(255, 200, 0,0.6);">
                <td colspan="${colspan}" style="text-align:center">You have got B grade !!🥳</td>
            </tr>
            `;
          } else if(totWeightageEqui >= 60 && totWeightageEqui < 70){
            tables[j].innerHTML += `
            <tr class="tableContent-level1" style="background: rgb(255, 150, 0,0.6);">
                <td colspan="${colspan}" style="text-align:center">You have got C grade !!🥳</td>
            </tr>
            `;
          } else if(totWeightageEqui >= 50 && totWeightageEqui < 60){
            tables[j].innerHTML += `
            <tr class="tableContent-level1" style="background: rgb(255, 100, 0,0.6);">
                <td colspan="${colspan}" style="text-align:center">You have got D grade !!🥳</td>
            </tr>
            `;
          } else if(totWeightageEqui >= 40 && totWeightageEqui < 50){
            tables[j].innerHTML += `
            <tr class="tableContent-level1" style="background: rgb(255, 50, 0,0.6);">
                <td colspan="${colspan}" style="text-align:center">You have got E grade !!🥳</td>
            </tr>
            `;
          }
    }
  }

    if (document.body) {
      document.body.dataset[APPLIED_FLAG] = "1";
    }
  };

  chrome.runtime.onMessage.addListener((request, _sender, sendResponse) => {
    // if (request?.message === "check_mark_view_applied") {
    //   sendResponse({
    //     onMarksPage: isMarksPage(),
    //     applied: isApplied()
    //   });
    //   return True;
    // }

    if (request?.message === "mark_view_page") {
      try {
        modifyMarksPage();
        sendResponse({ ok: true });
      } catch (_error) {
        // Log error so it's visible in the page console for debugging.
        console.error("VIT Companion: modifyMarksPage error", _error);
        sendResponse({ ok: false, error: _error?.message || String(_error) });
      }
      return true;
    }
  });

  // Auto-run the enhancement when the script loads or when the marks table is added later.
  try {
    if (isMarksPage()) {
      modifyMarksPage();
      console.log("VIT Companion: modifyMarksPage auto-applied");
    } else {
      const observer = new MutationObserver((mutations, obs) => {
        if (isMarksPage()) {
          try {
            modifyMarksPage();
            console.log("VIT Companion: modifyMarksPage applied via MutationObserver");
          } catch (err) {
            console.error("VIT Companion: modifyMarksPage error (observer)", err);
          }
          obs.disconnect();
        }
      });
      observer.observe(document.documentElement || document.body, { childList: true, subtree: true });
    }
  } catch (e) {
    console.error("VIT Companion: auto-run error", e);
  }
})();
