<script lang="ts">
  import { onMount } from 'svelte';
  import { goto } from '$app/navigation';
  import { pb, getTeacherName, isTeacherLoggedIn, makeSlug } from '$lib/pocketbase';

  type PrintRequest = {
    id: string;
    title: string;
    slug: string;
    description?: string;
    created?: string;
  };

  type Submission = {
    id: string;
    teacher_id: string;
    request_id: string;
    request_slug: string;
    request_title: string;
    student_name: string;
    note?: string;
    created?: string;
    file: string | string[];
  };

  function submissionFileName(submission: Submission) {
    return Array.isArray(submission.file) ? submission.file[0] : submission.file;
  }

  function submissionDate(created?: string) {
    if (!created) return 'Earlier submission';
    return new Date(created).toLocaleString();
  }

  let teacherName = '';
  let requests: PrintRequest[] = [];
  let submissions: Submission[] = [];
  let title = '';
  let description = '';
  let status = '';
  let loading = true;
  let requestBusy = false;
  let showCreateForm = false;

  async function loadData() {
    loading = true;
    try {
      teacherName = getTeacherName();
      const teacherId = pb.authStore.model?.id;
      if (!teacherId) throw new Error('Missing teacher account.');

      const [requestList, submissionList] = await Promise.all([
        pb.collection('print_requests').getFullList<PrintRequest>({
          sort: '-created',
          filter: `teacher_id = "${teacherId}"`
        }),
        pb.collection('submissions').getFullList<Submission>({
          sort: '-created',
          filter: `teacher_id = "${teacherId}"`
        })
      ]);
      requests = requestList;
      submissions = submissionList;
    } catch (error) {
      status = error instanceof Error ? error.message : 'Could not load dashboard.';
    } finally {
      loading = false;
    }
  }

  onMount(async () => {
    if (!isTeacherLoggedIn()) {
      await goto('/');
      return;
    }
    await loadData();
  });

  async function createRequest() {
    if (!title.trim()) {
      status = 'Add a class or project title first.';
      return;
    }

    requestBusy = true;
    status = '';
    try {
      await pb.collection('print_requests').create({
        title,
        description,
        slug: makeSlug(title),
        teacher_id: pb.authStore.model?.id
      });
      title = '';
      description = '';
      showCreateForm = false;
      await loadData();
      status = 'Class link created and ready to share.';
    } catch (error) {
      status = error instanceof Error ? error.message : 'Could not create request.';
    } finally {
      requestBusy = false;
    }
  }

  async function copyLink(slug: string) {
    await navigator.clipboard.writeText(`${window.location.origin}/${slug}`);
    status = 'Class link copied.';
  }

  function signOut() {
    pb.authStore.clear();
    goto('/');
  }

  $: submissionCountByRequest = requests.reduce<Record<string, number>>((acc, request) => {
    acc[request.id] = submissions.filter((submission) => submission.request_id === request.id).length;
    return acc;
  }, {});
</script>

<svelte:head>
  <title>ClassPrint3D | Teacher Dashboard</title>
</svelte:head>

<main class="teacher-dashboard">
  <aside class="dashboard-sidebar">
    <a class="brand" href="/" aria-label="ClassPrint3D home">
      <span class="brand-mark" aria-hidden="true"><i></i><i></i><i></i></span>
      <span>ClassPrint3D</span>
    </a>

    <nav class="dashboard-nav" aria-label="Dashboard navigation">
      <a class="dashboard-nav-item active" href="#print-queue"><span aria-hidden="true">&#9632;</span> Print queue</a>
      <a class="dashboard-nav-item" href="#class-links"><span aria-hidden="true">&#8599;</span> Class links</a>
    </nav>

    <div class="sidebar-account">
      <span class="teacher-avatar">{teacherName.slice(0, 2).toUpperCase() || 'TE'}</span>
      <div><strong>{teacherName || 'Teacher'}</strong><span>Teacher workspace</span></div>
      <button onclick={signOut} aria-label="Sign out" title="Sign out">&#8594;</button>
    </div>
  </aside>

  <section class="dashboard-main" id="print-queue">
    <header class="dashboard-header">
      <div>
        <div class="section-label"><span></span> Teacher dashboard</div>
        <h1>Your print queue</h1>
        <p>Review student models and keep every project ready for the printer.</p>
      </div>
      <button class="new-link-button" onclick={() => (showCreateForm = !showCreateForm)}>
        <span aria-hidden="true">+</span> New class link
      </button>
    </header>

    {#if showCreateForm}
      <section class="create-link-panel" aria-labelledby="create-link-title">
        <div class="create-link-heading">
          <div>
            <div class="section-label"><span></span> New project</div>
            <h2 id="create-link-title">Create a student upload link</h2>
          </div>
          <button class="close-form" onclick={() => (showCreateForm = false)} aria-label="Close create link form">&times;</button>
        </div>
        <form class="create-link-form" onsubmit={(event) => { event.preventDefault(); createRequest(); }}>
          <label>
            <span>Class or project name</span>
            <input bind:value={title} placeholder="Period 4: Design Lab" required />
          </label>
          <label>
            <span>Student instructions <small>(optional)</small></span>
            <textarea bind:value={description} placeholder="Tell students what to include with their model."></textarea>
          </label>
          <button disabled={requestBusy}>{requestBusy ? 'Creating link...' : 'Create and share link'} <span aria-hidden="true">&rarr;</span></button>
        </form>
      </section>
    {/if}

    {#if status}
      <p class="dashboard-status" role="status">{status}</p>
    {/if}

    <div class="dashboard-summary">
      <div><span>INCOMING FILES</span><strong>{submissions.length}</strong><small>total submissions</small></div>
      <div><span>ACTIVE PROJECTS</span><strong>{requests.length}</strong><small>class links open</small></div>
      <div><span>NEWEST UPLOAD</span><strong>{submissions[0] ? submissionFileName(submissions[0]).split('.').pop()?.toUpperCase() : '---'}</strong><small>{submissions[0] ? 'ready to review' : 'no files yet'}</small></div>
    </div>

    <section class="queue-section" aria-labelledby="queue-title">
      <div class="queue-section-header">
        <div><h2 id="queue-title">Student submissions</h2><p>Newest files appear at the top of your queue.</p></div>
        <span class="queue-total">{submissions.length} total</span>
      </div>

      {#if loading}
        <div class="dashboard-empty">Loading your print queue...</div>
      {:else if submissions.length === 0}
        <div class="dashboard-empty"><span aria-hidden="true">&#8593;</span><h3>Your queue is ready</h3><p>Create a class link, then share it with students to start receiving print files.</p></div>
      {:else}
        <div class="dashboard-submission-list">
          {#each submissions as submission, index}
            <article class:latest={index === 0} class="dashboard-submission">
              <span class="dashboard-file-icon" aria-hidden="true">3D</span>
              <div class="submission-name"><strong>{submissionFileName(submission)}</strong><span>Submitted by {submission.student_name}</span></div>
              <div class="submission-project"><span>{submission.request_title}</span><small>{submissionDate(submission.created)}</small></div>
              {#if index === 0}<span class="new-submission">New</span>{/if}
              {#if submission.file}
                <a class="download-file" href={`${'/api'}/files/submissions/${submission.id}/${submissionFileName(submission)}`} target="_blank" rel="noreferrer">Download <span aria-hidden="true">&#8595;</span></a>
              {/if}
              {#if submission.note}<p class="submission-note">{submission.note}</p>{/if}
            </article>
          {/each}
        </div>
      {/if}
    </section>
  </section>

  <aside class="dashboard-projects" id="class-links">
    <div class="projects-heading">
      <div><div class="section-label"><span></span> Class links</div><h2>Active projects</h2></div>
      <button onclick={() => (showCreateForm = true)} aria-label="Create a new class link">+</button>
    </div>

    {#if loading}
      <p class="projects-loading">Loading projects...</p>
    {:else if requests.length === 0}
      <div class="projects-empty"><span aria-hidden="true">+</span><p>Your class links will live here.</p><button onclick={() => (showCreateForm = true)}>Create your first link</button></div>
    {:else}
      <div class="project-list">
        {#each requests as request}
          <article class="project-card">
            <div class="project-card-title"><span class="project-icon" aria-hidden="true">&#9670;</span><div><h3>{request.title}</h3><p>{submissionCountByRequest[request.id] ?? 0} submission{(submissionCountByRequest[request.id] ?? 0) === 1 ? '' : 's'}</p></div></div>
            {#if request.description}<p class="project-description">{request.description}</p>{/if}
            <div class="project-actions">
              <a href={`/${request.slug}`} target="_blank" rel="noreferrer">Open <span aria-hidden="true">&#8599;</span></a>
              <button onclick={() => copyLink(request.slug)}>Copy link</button>
            </div>
          </article>
        {/each}
      </div>
    {/if}
  </aside>
</main>
