async function addSubject() {
  const name = document.getElementById("name").value.trim();
  const date = document.getElementById("date").value;
  const fileInput = document.getElementById("syllabus");
  const status = document.getElementById("scanStatus");
  const addBtn = document.getElementById("addBtn");
  const file = fileInput.files[0];

  // messages are shown on the page (not alerts), so they can't be blocked
  if (!name || !date) { status.textContent = "Enter a subject name and an exam date."; return; }
  if (date <= startDate) {
    status.textContent = "The exam date must be after " + startDate + " (the day your plan starts).";
    return;
  }
  if (file && file.type !== "application/pdf") { status.textContent = "Please attach a PDF file."; return; }
  if (file && file.size > 10 * 1024 * 1024) { status.textContent = "The PDF is too large (maximum 10 MB)."; return; }

  let difficulty = 3;   // used if there is no syllabus or the scan fails
  let topics = [];
  status.textContent = "Added " + name + ".";

  if (file) {
    status.textContent = "Scanning syllabus...";
    addBtn.disabled = true;
    try {
      const result = await scanSyllabus(file);
      difficulty = result.difficulty;
      topics = result.topics;
      status.textContent = "Found " + topics.length + " topics. Difficulty: " + difficulty + "/5.";
    } catch (error) {
      status.textContent = "Could not scan the PDF (is server.js running?). Added with medium difficulty.";
    }
    addBtn.disabled = false;
  }
  

  subjects.push({ name, date, difficulty, topics });
  document.getElementById("name").value = "";
  fileInput.value = "";
  save();
  render();
}
