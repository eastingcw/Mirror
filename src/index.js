import 'es6-promise/auto'
import { polyfill } from 'smoothscroll-polyfill'

import './style/'

import API from './api/'
import Router from './router/'
import Issues from './template/issues'
import Issue from './template/issue'
import User from './template/user'
import Comments from './template/comments'
import observer from './util/observer'
import diff from './util/diff'

polyfill()

const issues = new Issues('#posts')
const issue = new Issue('#post')
const user = new User('#user')
const comments = new Comments('#comments')
const router = new Router({ '/posts': onPosts, '/posts/:id': onPost })

window.Mirror = { __: {}, issue: {}, comments: {} }

observer(Mirror, 'user', function(v) { user._(v) })
observer(Mirror, 'issues', function(v) { issues._(v) })
observer(Mirror, 'issue', function(n, o) { issue._(diff(n, o)) })
observer(Mirror, 'comments', function(n, o) { comments._(diff(n, o)) })

function onPosts() {
  if (Mirror.user) {
    user._(Mirror.user)
    return Mirror.getPosts()
  }

  return API.user._()
  .then((res) => {
    Mirror.user = res.user
    return Mirror.getPosts()
  })
  .catch(err => console.log(err))
}

function onPost(params) {
  Mirror.getPost(params.id)
}

Mirror.getPosts = function(after = '') {
  document.title = window.config.title

  if (this.issues && !after) {
    return issues._(this.issues)
  }

  return API.issues._(after)
  .then((res) => {
    const { edges, totalCount, pageInfo } = res.repository.issues
    const issues = {
      pageInfo,
      totalCount,
      edges: this.issues ? this.issues.edges.concat(edges) : edges
    }

    this.issues = issues
  })
  .catch(err => console.log(err))
}

Mirror.getPost = function(number) {
  if (this.issue[number]) {
    document.title = `${this.issue[number].title} - ${window.config.title}`
    return issue._(this.issue[number])
  }

  document.title = 'loading'

  return API.issue._(number)
  .then((res) => {
    document.title = `${res.repository.issue.title} - ${window.config.title}`
    this.issue = Object.assign({ [number]: res.repository.issue }, this.issue)
  })
  .catch(err => console.log(err))
}

Mirror.openComments = function(params) {
  document.querySelector('#comments').innerHTML = ''
  this.getComments(params)
}

Mirror.getComments = function(params) {
  const [id, after] = params.split('#')

  if (this.comments[id] && !after) {
    return comments._(this.comments[id])
  }

  return API.comments._(id, after)
  .then((res) => {
    const {
      number,
      comments: { totalCount, pageInfo, edges }
    } = res.repository.issue

    const newEdges = this.comments[id] && number === parseInt(id) ?
    this.comments[id].comments.edges.concat(edges) : edges

    const issue = {
      number,
      comments: {
        totalCount,
        pageInfo,
        edges: newEdges
      }
    }

    const comments = Object.assign({}, this.comments)

    if (number === parseInt(id)) {
      comments[id] = issue
      this.comments = comments
    } else {
      this.comments = Object.assign({ [number]: issue }, this.comments)
    }
  })
  .catch(err => console.log(err))
}

router.notFound = function(params) {
  router.go('/posts')
}

router.start()

console.log("%c Github %c","background:#24272A; color:#ffffff","","https://github.com/LoeiFy/Mirror")
