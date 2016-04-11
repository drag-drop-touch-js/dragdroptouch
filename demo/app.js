'use strict';

// define angular app (with dependency on Wijmo)
var app = angular.module('app', ['wj']);

// define app's single controller
app.controller('appCtrl', function ($scope) {

    //-----------------------------------------------------------------------------
    // demonstrate standard HTML5 drag/drop.
    // this is based on the html5rocks tutorial published here:
    // http://www.html5rocks.com/en/tutorials/dnd/basics/

    // hook up event handlers
    var cols = document.querySelectorAll('#columns .column');
    [].forEach.call(cols, function (col) {
        col.addEventListener('dragstart', handleDragStart, false);
        col.addEventListener('dragenter', handleDragEnter, false)
        col.addEventListener('dragover', handleDragOver, false);
        col.addEventListener('dragleave', handleDragLeave, false);
        col.addEventListener('drop', handleDrop, false);
        col.addEventListener('dragend', handleDragEnd, false);
    });

    var dragSrcEl = null;
    function handleDragStart(e) {
        if (e.target.className.indexOf('column') > -1) {
            dragSrcEl = e.target;
            dragSrcEl.style.opacity = '0.4';
            var dt = e.dataTransfer;
            dt.effectAllowed = 'move';
            dt.setData('text', dragSrcEl.innerHTML);

            // customize drag image for one of the panels
            if (dt.setDragImage instanceof Function && e.target.innerHTML.indexOf('X') > -1) {
                var img = new Image();
                img.src = 'dragimage.jpg';
                dt.setDragImage(img, img.width / 2, img.height / 2);
            }
        }
    }
    function handleDragOver(e) {
        if (dragSrcEl) {
            e.preventDefault();
            e.dataTransfer.dropEffect = 'move';
        }
    }
    function handleDragEnter(e) {
        if (dragSrcEl) {
            e.target.classList.add('over');
        }
    }
    function handleDragLeave(e) {
        if (dragSrcEl) {
            e.target.classList.remove('over');
        }
    }
    function handleDragEnd(e) {
        dragSrcEl = null;
        [].forEach.call(cols, function (col) {
            col.style.opacity = '';
            col.classList.remove('over');
        });
    }
    function handleDrop(e) {
        if (dragSrcEl) {
            e.stopPropagation();
            e.stopImmediatePropagation();
            e.preventDefault();
            if (dragSrcEl != this) {
                dragSrcEl.innerHTML = e.target.innerHTML;
                this.innerHTML = e.dataTransfer.getData('text');
            }
        }
    }

    //-----------------------------------------------------------------------------
    // define some sample data for the FlexGrid and Olap controls
    var products = 'Alpina,Gumpert,Isdera,Keinath,Adler,Borgward'.split(','),
        countries = 'USA,UK,Japan,Germany'.split(',');
    $scope.data = [];
    for (var i = 0; i < 100; i++) {
        $scope.data.push({
            id: i,
            product: products[i % products.length],
            country: countries[i % countries.length],
            sales: Math.round(20 + Math.random() * 100),
            inquiries: Math.round(100 + Math.random() * 1000)
        })
    }
});
