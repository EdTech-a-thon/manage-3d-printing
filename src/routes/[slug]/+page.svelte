<script lang="ts">
  import { page } from '$app/state';
  import { onMount } from 'svelte';
  import { pb } from '$lib/pocketbase';

  type PrintRequest = {
    id: string;
    teacher_id: string;
    title: string;
    slug: string;
    description?: string;
  };

  let request: PrintRequest | null = null;
  let studentName = '';
  let note = '';
  let file: File | null = null;
  let status = '';
  let busy = false;
  let submitted = false;
  let slug = '';

  type SubmissionError = Error & {
    status?: number;
    response?: {
      message?: string;
      data?: Record<string, { message?: string }>;
    };
  };

  function submissionErrorMessage(error: unknown) {
    const submissionError = error as SubmissionError;
    const fieldLabels: Record<string, string> = { student_name: 'Your name', note: 'Note', file: 'File' };
    const details = Object.entries(submissionError.response?.data ?? {}).map(
      ([field, issue]) => `${fieldLabels[field] ?? field}: ${issue.message ?? 'This value is not valid.'}`
    );

    if (details.length > 0) return `Could not submit the file. ${details.join(' ')}`;
    if (submissionError.status === 413) return 'Could not submit the file. The file is too large.';
    if (!submissionError.status) return 'Could not submit the file. The server could not be reached. Check your connection and try again.';
    return `Could not submit the file. ${submissionError.response?.message || submissionError.message || 'Please try again.'}`;
  }

  async function loadRequest() {
    slug = page.params.slug ?? '';
    if (!slug) {
      status = 'This print link was not found.';
      request = null;
      return;
    }
    status = '';
    try {
      const records = await pb.collection('print_requests').getFullList<PrintRequest>({
        filter: `slug = "${slug.replace(/"/g, '\\"')}"`,
        limit: 1
      });
      request = records[0] ?? null;
      if (!request) status = 'This print link was not found.';
    } catch (error) {
      status = error instanceof Error ? error.message : 'Could not load the request.';
    }
  }

  onMount(loadRequest);

  function chooseFile(event: Event) {
    const target = event.currentTarget as HTMLInputElement;
    file = target.files?.[0] ?? null;
  }

  async function submit() {
    if (!request) return;
    if (!studentName.trim() || !file) {
      status = 'Add your name and choose a file.';
      return;
    }

    busy = true;
    status = '';
    try {
      const form = new FormData();
      form.append('teacher_id', request.teacher_id);
      form.append('request_id', request.id);
      form.append('request_slug', request.slug);
      form.append('request_title', request.title);
      form.append('student_name', studentName);
      form.append('note', note);
      form.append('file', file);

      await pb.collection('submissions').create(form);
      submitted = true;
      status = 'Submission received. Your teacher can see it now.';
    } catch (error) {
      status = submissionErrorMessage(error);
    } finally {
      busy = false;
    }
  }

  function submitAnother() {
    studentName = '';
    note = '';
    file = null;
    status = '';
    submitted = false;
  }
</script>

<svelte:head>
  <title>{request ? `${request.title} | ClassPrint3D` : 'Submit 3D Print | ClassPrint3D'}</title>
  <meta name="description" content="Upload a 3D print file for your class project." />
</svelte:head>

<main class="student-upload-page">
  <header class="student-nav">
    <a class="brand" href="/" aria-label="ClassPrint3D home">
      <span class="brand-mark" aria-hidden="true"><i></i><i></i><i></i></span>
      <span>ClassPrint3D</span>
    </a>
    <span class="student-nav-label">Student upload</span>
  </header>

  <section class="student-workspace" aria-labelledby="request-title">
    <div class="student-request-heading">
      <div class="section-label"><span></span> Your class print project</div>
      <h1 id="request-title">{request ? request.title : 'Loading your project...'}</h1>
        <p>{request?.description || 'Upload your 3D model and your teacher will add it to the print queue.'}</p>
    </div>

    {#if request && !submitted}
      <form class="student-upload-card" onsubmit={(event) => { event.preventDefault(); submit(); }}>
        <div class="upload-card-heading"><span class="upload-card-icon" aria-hidden="true">&#8593;</span><div><h2>Send your model</h2><p>Fill in your details, then select your file.</p></div></div>
        <label class="student-field">
          <span>Your name</span>
          <input bind:value={studentName} placeholder="Jordan L." autocomplete="name" required />
        </label>
        <label class:has-file={!!file} class="file-picker">
          <input type="file" onchange={chooseFile} required />
          <span class="file-picker-icon" aria-hidden="true">{file ? '✓' : '↑'}</span>
          <span class="file-picker-copy"><strong>{file ? file.name : 'Choose your 3D print file'}</strong><small>{file ? `${Math.ceil(file.size / 1024)} KB selected` : 'STL, OBJ, or any file your teacher requested'}</small></span>
          <span class="file-picker-button">Browse</span>
        </label>
        <label class="student-field">
          <span>Note for your teacher <small>(optional)</small></span>
          <textarea bind:value={note} placeholder="Color, size, or any special instructions"></textarea>
        </label>
        <button class="student-submit" disabled={busy}>{busy ? 'Sending your file...' : 'Submit to print queue'} <span aria-hidden="true">&rarr;</span></button>
        {#if status}<p class="student-status" role="alert">{status}</p>{/if}
      </form>
    {:else if submitted}
      <section class="student-success" aria-live="polite">
        <span class="success-check" aria-hidden="true">&#10003;</span>
        <div class="section-label"><span></span> File received</div>
        <h2>You're in the queue.</h2>
        <p>{status}</p>
        <button onclick={submitAnother}>Submit another file <span aria-hidden="true">&rarr;</span></button>
      </section>
    {:else if status}
      <section class="student-error" role="alert"><span aria-hidden="true">!</span><div><h2>We could not open this link</h2><p>{status}</p></div></section>
    {/if}
  </section>

  <footer class="student-footer"><span class="student-footer-mark" aria-hidden="true">&#10003;</span> No account needed. Your file goes straight to your teacher's print queue.</footer>
</main>
