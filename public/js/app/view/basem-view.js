define(['App', 'underscore', 'backbone', 'cookie'],
	function(App, _, Backbone, Cookie) {
		return Backbone.Marionette.Layout.extend({

			destroy: function() {
				console.log("destroying a view")
				this.remove();
				this.unbind();
			},
			api: function(url, type, params, callback) {
				if (this.checkIfLoggedIn() === true || params.byPassAuth === true) {
					var cookie = $.cookie('reddit_session');

					$.ajax({
						url: "/api?url=" + url + "&cookie=" + cookie,
						type: type,
						dataType: "json",
						data: params,
						success: function(data) {
							callback(data)
						},
						error: function(data) {
							console.log("ERROR inrequest details: ", data);
							callback(data)

						}
					});
				} else {
					console.log("params in not logged in", params)
					alert("Please login to do that")
				}
			},
			checkIfLoggedIn: function() {
				var username = $.cookie('username')
				if (typeof username !== "undefined") {
					return true;
				} else {
					return false;
				}
			}, //so we resize it does not do a resize for every pixel the user resizes
			//it has a timeout that fires after the user is done resizing
			debouncer: function(func) {
				var timeoutID, timeout = timeout || 100;
				return function() {
					var scope = this,
						args = arguments;
					clearTimeout(timeoutID);
					timeoutID = setTimeout(function() {
						func.apply(scope, Array.prototype.slice.call(args));
					}, timeout);
				}
			},
			//smooth scrolling to the top of the screen
			scrollTop: function() {
				console.log('scrolltop now')
				$('html, body').animate({
					scrollTop: 0
				}, 150);
			},
			dynamicStylesheet: function(name) {

				if (window.settings.get('customCSS') === true && $(document).width() > App.mobileWidth) {
					if (this.subName == 'front') {
						$("#subredditStyle").attr("href", "");
					} else {
						$("#subredditStyle").attr("href", "http://www.reddit.com/r/" + name + "/stylesheet");
					}
				}
			},
			//Can be used to vote on a post or a comment
			vote: function(dir, id) {
				var self = this
				var params = {
					id: id,
					dir: dir,
					uh: $.cookie('modhash')
				};

				console.log(params)

				this.api("api/vote", 'POST', params, function(data) {
					console.log("vote done", data)

				});

			},
			upvote: function(e) {
				e.preventDefault()
				e.stopPropagation()

				if (this.checkIfLoggedIn() === true) {
					if (typeof this.model !== 'undefined' && this.model.get('likes') === false || this.model.get('likes') === null) {
						console.log('upvoting', this.model)
						this.vote(1, this.model.get('name'))
						var id = this.model.get('id')
						this.model.set('likes', true)
						this.model.set('downmod', 'down')
						this.model.set('upmod', 'upmod')
						this.model.set('voted', 'likes')

						// this.$('.midcol .dislikes').hide()
						// this.$('.midcol .likes').show()
						// this.$('.midcol .unvoted').hide()

						this.ui.midcol.removeClass('unvoted likes dislikes')
						this.ui.midcol.addClass('likes')

						// this.$('.upArrow').addClass('upmod')
						// this.$('.upArrow').removeClass('up')
						// this.$('.downArrow').addClass('down')
						// this.$('.downArrow').removeClass('downmod')
						this.ui.upArrow.addClass('upmod')
						this.ui.upArrow.removeClass('up')
						this.ui.downArrow.addClass('down')
						this.ui.downArrow.removeClass('downmod')

					} else {
						this.cancelVote()
					}
				} else {
					this.showLoginBox()
				}
			},
			downvote: function(e) {
				e.preventDefault()
				e.stopPropagation()
				if (this.checkIfLoggedIn() === true) {
					if (this.model.get('likes') === true || this.model.get('likes') === null) {

						this.vote(-1, this.model.get('name'))
						var id = this.model.get('id')
						this.model.set('likes', false)
						this.model.set('downmod', 'downmod')
						this.model.set('upmod', 'up')
						this.model.set('voted', 'dislikes')

						this.ui.midcol.removeClass('unvoted likes dislikes')
						this.ui.midcol.addClass('dislikes')

						this.ui.upArrow.addClass('up')
						this.ui.upArrow.removeClass('upmod')
						this.ui.downArrow.addClass('downmod')
						this.ui.downArrow.removeClass('down')

					} else {
						this.cancelVote()
					}
				} else {
					this.showLoginBox()
				}
			},
			cancelVote: function() {
				this.vote(0, this.model.get('name'))
				var id = this.model.get('id')
				this.model.set('likes', null)
				this.model.set('downmod', 'down')
				this.model.set('upmod', 'up')
				this.model.set('voted', 'unvoted')

				this.ui.midcol.removeClass('unvoted likes dislikes')
				this.ui.midcol.addClass('unvoted')

				this.ui.upArrow.addClass('up')
				this.ui.upArrow.removeClass('upmod')
				this.ui.downArrow.addClass('down')
				this.ui.downArrow.removeClass('downmod')
			},
			save: function(id) {
				if (this.checkIfLoggedIn() === true) {
					var self = this
					var params = {
						id: id,
						dir: dir,
						uh: $.cookie('modhash')
					};

					this.api("api/vote", 'POST', params, function(data) {
						console.log("saving done", data)
						self.model.set('saved', true)

					});
				} else {
					this.showLoginBox()
				}
			},
			//attempts to create a new comment
			comment: function(e) {
				e.preventDefault()
				e.stopPropagation()

				if (this.checkIfLoggedIn() === true) {
					var self = this

					var id = this.model.get('name')
					//var text = this.$('#text' + id).val()
					var text = this.ui.text.val()
					text = this.sterilize(text) //clean the input

					var params = {
						api_type: 'json',
						thing_id: id,
						text: text,
						uh: $.cookie('modhash')
					};
					console.log(params)

					this.api("/api/comment", 'POST', params, function(data) {
						console.log("comment done", data)
						self.commentCallback(data)
					});
				} else {
					this.showLoginBox()
				}
			}, //callback after trying to write a comment
			commentCallback: function(data) {
				console.log('callback comment=', data)
				CommentModel = require('model/comment') //in order to have nested models inside of models we need to do this
				CommentView = require('view/comment-view') //in cases of recursion its ok!

				//post comment to have the new ID from this data 
				if (typeof data !== 'undefined' && typeof data.json !== 'undefined' && typeof data.json.data !== 'undefined' && typeof data.json.data.things !== 'undefined') {
					//status{{model.name}}
					this.ui.status.html('<span class="success">success!</span>')
					//data.json.data.things[0].data.link_id = this.model.get('name')
					var attributes = data.json.data.things[0].data
					attributes.author = $.cookie('username');

					//this if statement will only fire during a comment callback
					if (typeof attributes.body_html === 'undefined' && typeof attributes.contentHTML === 'string') {
						attributes.body_html = attributes.contentHTML
					}

					attributes.name = attributes.id
					if (typeof attributes.link === 'undefined') {
						attributes.link_id = this.model.get('name')

					} else {
						attributes.link_id = attributes.link
					}

					attributes.likes = true
					attributes.subreddit = this.model.get('subreddit')
					attributes.smallid = attributes.id.replace('t1_', '')
					attributes.smallid = attributes.id.replace('t3_', '')
					attributes.permalink = '/r/' + data.subreddit + '/comments/' + attributes.link_id + "#" + attributes.id

					attributes.downs = 0
					attributes.ups = 1

					//clear the users text
					this.ui.text.val("")

					var newModel = new CommentModel(attributes) //shouldn't have to input this data into the model twice
					this.hideUserInput()

					newModel.set('permalink', this.permalinkParent + attributes.id)
					newModel.set('permalinkParent', this.permalinkParent)

					App.trigger("comment:addOneChild" + newModel.get('parent_id'), newModel);

				} else {
					//this.$('.status' + this.model.get('name')).html('error ' + data)
					//this.ui.status.html('<div class="error">' + data.json.errors[0][1] + '</div>')
					this.ui.status.html('<div class="error">' + data.responseText + '</div>')

				}
			}, //hides the comment reply textbox
			hideUserInput: function(e) {
				if (typeof e !== 'undefined') {
					e.preventDefault()
					e.stopPropagation()
				}
				this.ui.commentreply.hide()
			},

			//sterilizes user input 
			sterilize: function(HTMLString) {
				HTMLString = HTMLString.replace(/<img /gi, "<imga ");
				var att, x = 0,
					y, coll, c = [],
					probe = document.createElement("div");
				probe.innerHTML = HTMLString;
				coll = probe.getElementsByTagName("*");
				while (coll[x]) {
					if (coll[x]) {
						c.push(coll[x++])
					}

				}
				for (x in c)
					if (/(script|object|embed|iframe)/i.
						/*you can blacklist more tags here!*/
						test(c[x].tagName)) {
						c[x].outerHTML = "";
					} else {
						if (c[x].href)
							if (/java/.test(coll[x].protocol)) {
								c[x].href = "#"
							}
						att = c[x].attributes;
						for (y in att)
							if (att[y])
								if (/(^on|style)/i.test(att[y].name))
									c[x].removeAttribute(att[y].name);
					}
				c = probe.innerHTML.replace(/imga/gi, "img");
				return c.replace(/<\/img>/gi, "");
			}, //shows the user markdown help 
			showMdHelp: function(e) {
				e.preventDefault()
				e.stopPropagation()

				var mdHelp = '<p></p><p>reddit uses a slightly-customized version of <a href="http://daringfireball.net/projects/markdown/syntax">Markdown</a> for formatting. See below for some basics, or check <a href="/wiki/commenting">the commenting wiki page</a> for more detailed help and solutions to common issues.</p><p></p><table class="md"><tbody><tr style="background-color: #ffff99;text-align: center"><td><em>you type:</em></td><td><em>you see:</em></td></tr><tr><td>*italics*</td><td><em>italics</em></td></tr><tr><td>**bold**</td><td><b>bold</b></td></tr><tr><td>[reddit!](http://reddit.com)</td><td><a href="http://reddit.com">reddit!</a></td></tr><tr><td>* item 1<br>* item 2<br>* item 3</td><td><ul><li>item 1</li><li>item 2</li><li>item 3</li></ul></td></tr><tr><td>>quoted text</td><td><blockquote>quoted text</blockquote></td></tr><tr><td>Lines starting with four spaces<br>are treated like code:<br><br><span class="spaces">    </span>if 1 * 2 <3:<br><span class="spaces">        </span>print "hello, world!"<br></td><td>Lines starting with four spaces<br>are treated like code:<br><pre>if 1 * 2 <3:<br>    print "hello, world!"</pre></td></tr><tr><td>~~strikethrough~~</td><td><strike>strikethrough</strike></td></tr><tr><td>super^script</td><td>super<sup>script</sup></td></tr></tbody></table></div></div></form>'
				this.ui.mdHelp.html(mdHelp).show()
				this.ui.mdHelpShow.hide()
				this.ui.mdHelpHide.show()
			},
			hideMdHelp: function(e) {
				e.preventDefault()
				e.stopPropagation()
				this.ui.mdHelpShow.show()
				this.ui.mdHelpHide.hide()
				this.ui.mdHelp.html('')
			},

			//so users can report spam
			reportShow: function(e) {
				e.preventDefault()
				e.stopPropagation()
				//this.$('#reportConfirm' + this.model.get('id')).toggle()
				this.ui.reportConfirm.toggle()
			},
			reportYes: function(e) {
				e.preventDefault()
				e.stopPropagation()
				this.ui.reportConfirm.hide()
				var params = {
					id: this.model.get('name'),
					uh: $.cookie('modhash')
				}
				console.log(params)

				this.api("/api/report", 'POST', params, function(data) {
					console.log("report done", data)

				});
			},
			checkIsImg: function(url) {
				return (url.match(/\.(jpeg|jpg|gif|png)$/) !== null);
			},
			fixImgur: function(url) {
				if (this.containsStr("imgur.com", url)) {
					//check if its a gallery
					if (this.containsStr("imgur.com/a", url) === true || this.containsStr("gallery", url) === true) {
						return false
					} else {
						//return url + "l.jpg"  //add l to the end of the img url to give it a better preview
						//first remove query parameters from the url
						url = url.replace(/(\?.*)|(#.*)|(&.*)/g, "")
						return url + ".jpg"
					}

				}
				return false;
			},
			containsStr: function(needle, haystack) {
				return (haystack.indexOf(needle) >= 0)
			},
			//so users can hide a post/link 
			hidePost: function(e) {
				e.preventDefault()
				e.stopPropagation()
				var self = this
				//this.$('div[data-fullname=' + this.model.get('name') + ']').hide()
				$(this.el).hide()
				var params = {
					id: this.model.get('name'),
					uh: $.cookie('modhash')
				};
				//console.log(params)

				this.api("/api/hide", 'POST', params, function(data) {
					console.log("hide done", data)
					self.model.set('hidden', true)

				});
			},
			//so users can hide a post/link 
			savePost: function(e) {
				e.preventDefault()
				e.stopPropagation()
				if (this.checkIfLoggedIn() === true) {
					var self = this
					this.ui.save.hide()
					this.ui.unsave.show()
					var params = {
						id: this.model.get('name'),
						uh: $.cookie('modhash')
					};
					console.log(params)

					this.api("/api/save", 'POST', params, function(data) {
						console.log("save done", data)
						self.model.set('saved', true)

					});
				} else {
					this.showLoginBox()
				}
			}, //so users can hide a post/link 
			unSavePost: function(e) {
				var self = this
				e.preventDefault()
				e.stopPropagation()
				this.ui.save.show()
				this.ui.unsave.hide()
				var params = {
					id: this.model.get('name'),
					uh: $.cookie('modhash')
				};
				console.log(params)

				this.api("/api/unsave", 'POST', params, function(data) {
					console.log("unsave done", data)
					self.model.set('saved', false)

				});
			},
			youtubeChecker: function(url) {

				//TODO: this type of link not working: http://youtu.be/YEZtgWIntpA?t=1m12s
				if (this.containsStr('youtu', url) === false) {
					return false
				}
				var splitOne = url.split(/v\/|v=|youtu\.be\//)[1]

				if (typeof splitOne !== 'undefined') {
					return splitOne.split(/[?&]/)[0];
				} else {
					return false
				}

			},
			showLoginBox: function() {
				App.trigger('header:showLoginBox')
			}
		});

	});