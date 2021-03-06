<template>
  <div>
    <div id="auto-update-body">
      <h1>PStorage Auto Update Test</h1>
      <p id="version"/>
      <hr/>
      <div id="notification" class="hidden">
        <p id="message"/>
        <button id="close-button" @click="closeNotification">
          Close
        </button>
        <button id="restart-button" @click="restartApp" class="hidden">
          Restart
        </button>
      </div>
    </div>
    <hr/>
    <h1>Items from Server</h1>
    <p v-if="error">Failed to receive items. {{ error }}</p>
    <ul v-else>
      <li v-for="item in items" :key="item.id">{{item.name}}</li>
    </ul>
    <h1>Set badge count</h1>
    <p>Click buttons below to set app badge count (calling Electron via preload script)</p>
    <p>Count: {{ count }}</p>
    <button @click="increase">
      Increase
    </button>
    <button @click="decrease" :disabled="count <= 0">
      Decrease
    </button>
    <h1>File dialog</h1>
    <button @click="open">Show Open Dialog</button>
    <button @click="save">Show Save Dialog</button>
    <p><strong>Selected File(s)</strong>: {{selectedFile}}</p>
  </div>
</template>

<script>
export default {
  data() {
    return {
      error: null,
      items: [],
      count: 0,
      selectedFile: 'None'
    }
  },
  created() {
    this.$http.get('/api/items')
      .then(response => {
        this.items = response.data;
        this.$log.info('Received items from server.')
      })
      .catch(error => {
        this.error = error
      })
  },
  mounted() {
    const setVersion = versionText => {
      const version = document.getElementById('version');
      version.innerText = versionText;
    };
    const message = document.getElementById('message');
    const notification = document.getElementById('notification');
    const onUpdateAvailable = () => {
      message.innerText = 'A new update is available. Downloading now...';
      notification.classList.remove('hidden');
    };
    const restartButton = document.getElementById('restart-button');
    console.log(message, notification, restartButton);
    const onUpdateDownloaded = () => {
      restartButton.classList.remove('hidden');
      message.innerText = 'Update Downloaded. It will be installed on restart. Restart now?';
      notification.classList.remove('hidden');
    };
    this.$interop.init(setVersion, onUpdateAvailable, onUpdateDownloaded);
  },
  methods: {
    closeNotification() {
      const notification = document.getElementById('notification');
      notification.classList.add('hidden');
    },
    restartApp() {
      this.$interop.restart();
    },
    increase() {
      this.count++;
      this.$interop.setBadgeCount(this.count);
    },
    decrease() {
      if (this.count > 0) {
        this.count--;
        this.$interop.setBadgeCount(this.count);
      }
    },
    open() {
      this.$interop.showOpenDialog({
        properties: ['openFile', 'multiSelections']
      }, filePaths => this.selectedFile = filePaths);
    },
    save() {
      this.$interop.showSaveDialog({},
        filename => this.selectedFile = filename);
    }
  }
}
</script>
